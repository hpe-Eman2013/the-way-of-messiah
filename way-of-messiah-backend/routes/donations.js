// routes/donations.js (CommonJS)
const express = require('express');
const mongoose = require('mongoose');
const Stripe = require('stripe');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// --- Simple Donation model (optional, keeps a record) ---
const donationSchema = new mongoose.Schema({
  amount: Number,              // dollars
  currency: { type: String, default: 'usd' },
  frequency: { type: String, enum: ['one-time','monthly'], default: 'one-time' },
  email: String,
  note: String,
  stripe_session_id: String,
  stripe_payment_intent: String,
  stripe_subscription_id: String,
  status: { type: String, default: 'pending' },
}, { timestamps: true });

const Donation = mongoose.models.Donation || mongoose.model('Donation', donationSchema);

// Utility
function dollarsToCents(x) { return Math.round(Number(x) * 100); }

// -------- One-time -----------
router.post('/checkout', async (req, res) => {
  try {
    const { amount, email, note, successUrl, cancelUrl } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).send('Invalid amount');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'], // Apple/Google Pay included automatically
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Donation to The Way of Messiah',
            description: note ? String(note).slice(0, 490) : undefined,
          },
          unit_amount: dollarsToCents(amount),
        },
        quantity: 1,
      }],
      success_url: successUrl || `${process.env.FRONTEND_URL}/donate?success=1`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/donate?canceled=1`,
      metadata: { frequency: 'one-time' },
    });

    // create a local record (optional)
    await Donation.create({
      amount, email, note,
      stripe_session_id: session.id,
      frequency: 'one-time',
      status: 'created',
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('checkout error', err);
    res.status(500).send('Failed to create checkout session');
  }
});

// -------- Monthly (subscription) -----------
/**
 * For subscriptions, Stripe requires a pre-created Price ID.
 * Create a single \"Monthly Donation\" price in the Stripe dashboard,
 * with \"Customer chooses price\" OFF and set a default (any value),
 * OR create several prices ($10, $25, $50...) and map them.
 *
 * Below supports dynamic tiers by creating a new Price on the fly
 * (kept under a single Product).
 */
router.post('/subscription', async (req, res) => {
  try {
    const { tierAmount, email, note, successUrl, cancelUrl } = req.body;
    const dollars = Number(tierAmount);
    if (!dollars || dollars <= 0) return res.status(400).send('Invalid amount');

    // Ensure a product exists (once). You can hardcode a product ID if preferred.
    const productId = process.env.STRIPE_MONTHLY_PRODUCT_ID;
    if (!productId) {
      return res.status(500).send('Missing STRIPE_MONTHLY_PRODUCT_ID');
    }

    // Create a price dynamically for this monthly amount
    const price = await stripe.prices.create({
      unit_amount: dollarsToCents(dollars),
      currency: 'usd',
      recurring: { interval: 'month' },
      product: productId,
      nickname: `$${dollars}/mo`,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: false,
      success_url: successUrl || `${process.env.FRONTEND_URL}/donate?success=1`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/donate?canceled=1`,
      metadata: { frequency: 'monthly', note: note || '' },
    });

    await Donation.create({
      amount: dollars,
      email,
      note,
      stripe_session_id: session.id,
      frequency: 'monthly',
      status: 'created',
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('subscription error', err);
    res.status(500).send('Failed to create subscription session');
  }
});

// -------- Stripe webhook (optional but recommended) --------
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Update local record
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
    }

    // Handle invoice.paid or charge.refunded etc. as needed

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    res.status(500).send('Webhook handler failed');
  }
});

module.exports = router;
