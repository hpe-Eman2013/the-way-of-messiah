// routes/donations.js (CommonJS)
// Drop-in router for one-time + monthly donations with Stripe Checkout
// IMPORTANT: Mount this router (app.use('/donations', router)) **before** any global express.json()
// or add a top-level raw handler for '/donations/webhook' before express.json(), so the webhook body remains raw.

const express = require('express');
const mongoose = require('mongoose');
const Stripe = require('stripe');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// --- Config (tweak as needed) ---
const MIN_DOLLARS = Number(process.env.DONATION_MIN || 1);
const MAX_DOLLARS = Number(process.env.DONATION_MAX || 100000);
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
const SUCCESS_PATH = process.env.DONATION_SUCCESS_PATH || '/donate/success';
const CANCEL_PATH  = process.env.DONATION_CANCEL_PATH  || '/donate/cancel';
const MONTHLY_PRODUCT_ID = process.env.STRIPE_MONTHLY_PRODUCT_ID; // required for subscriptions

// --- Simple Donation model (optional, keeps a record) ---
const donationSchema = new mongoose.Schema(
  {
    amount: Number, // dollars
  currency: { type: String, default: 'usd' },
    frequency: { type: String, enum: ['one-time', 'monthly'], default: 'one-time' },
  email: String,
  note: String,
  stripe_session_id: String,
  stripe_payment_intent: String,
  stripe_subscription_id: String,
  status: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

const Donation = mongoose.models.Donation || mongoose.model('Donation', donationSchema);

// --- Utils ---
function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }
function dollarsToCents(x) { return Math.round(Number(x) * 100); }
function sanitizeAmount(input) {
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  return clamp(n, MIN_DOLLARS, MAX_DOLLARS);
}

// ---------- Health (dev) ----------
router.get('/health', (req, res) => res.json({ ok: true }));

// ---------- One-time donation ----------
router.post('/checkout', async (req, res) => {
  try {
    const { amount, email, note, successUrl, cancelUrl } = req.body || {};
    const dollars = sanitizeAmount(amount);
    if (!dollars) return res.status(400).json({ error: 'Invalid amount' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'], // Apple/Google Pay auto-included
      customer_email: email || undefined,
      line_items: [
        {
        price_data: {
          currency: 'usd',
          product_data: {
              name: 'Donation — The Way of Messiah',
            description: note ? String(note).slice(0, 490) : undefined,
          },
            unit_amount: dollarsToCents(dollars),
        },
        quantity: 1,
        },
      ],
      success_url: successUrl || `${FRONTEND_URL}${SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}${CANCEL_PATH}`,
      metadata: { frequency: 'one-time' },
    });

    // Optional: create a local record
    try {
    await Donation.create({
        amount: dollars,
        email,
        note,
      stripe_session_id: session.id,
      frequency: 'one-time',
      status: 'created',
    });
    } catch (e) {
      // Non-fatal if DB is not connected
      console.warn('Donation.create skipped/failed:', e.message);
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('checkout error', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ---------- Monthly (subscription) ----------
// Requires STRIPE_MONTHLY_PRODUCT_ID to be set to a single Product ID in your Stripe account
router.post('/subscription', async (req, res) => {
  try {
    const { tierAmount, email, note, successUrl, cancelUrl } = req.body || {};
    if (!MONTHLY_PRODUCT_ID) return res.status(500).json({ error: 'Missing STRIPE_MONTHLY_PRODUCT_ID' });

    const dollars = sanitizeAmount(tierAmount);
    if (!dollars) return res.status(400).json({ error: 'Invalid amount' });

    // Create a dynamic monthly price under the shared product
    const price = await stripe.prices.create({
      unit_amount: dollarsToCents(dollars),
      currency: 'usd',
      recurring: { interval: 'month' },
      product: MONTHLY_PRODUCT_ID,
      nickname: `$${dollars}/mo`,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: false,
      success_url: successUrl || `${FRONTEND_URL}${SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}${CANCEL_PATH}`,
      metadata: { frequency: 'monthly', note: note || '' },
    });

    try {
    await Donation.create({
      amount: dollars,
      email,
      note,
      stripe_session_id: session.id,
      frequency: 'monthly',
      status: 'created',
    });
    } catch (e) {
      console.warn('Donation.create (sub) skipped/failed:', e.message);
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('subscription error', err);
    res.status(500).json({ error: 'Failed to create subscription session' });
  }
});

// ---------- Stripe webhook ----------
// Keep body RAW here. See top comment regarding mount order.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
      const session = event.data.object;
        // Update local record (both one-time and subscription)
      await Donation.findOneAndUpdate(
        { stripe_session_id: session.id },
        {
          status: 'paid',
          stripe_payment_intent: session.payment_intent || undefined,
          stripe_subscription_id: session.subscription || undefined,
          email: session.customer_details?.email || undefined,
        },
        { new: true }
      );
        break;
    }

      case 'invoice.paid': {
        // Subscription renewal; you could record recurring payments here.
        // const invoice = event.data.object;
        break;
      }

      case 'charge.refunded': {
        // Handle refunds if needed
        break;
      }

      default:
        // console.log('Unhandled event:', event.type);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    res.status(500).send('Webhook handler failed');
  }
});

module.exports = router;
