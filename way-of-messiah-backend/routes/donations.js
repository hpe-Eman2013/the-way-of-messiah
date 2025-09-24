// routes/donations.js (CommonJS)
// Drop-in router for one-time + monthly donations with Stripe Checkout
// IMPORTANT: Mount this router (app.use('/donations', router)) **before** any global express.json()
// or add a top-level raw handler for '/donations/webhook' before express.json(), so the webhook body remains raw.

const express = require("express");
const mongoose = require("mongoose");
const Stripe = require("stripe");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// --- Config (tweak as needed) ---
const MIN_DOLLARS = Number(process.env.DONATION_MIN || 1);
const MAX_DOLLARS = Number(process.env.DONATION_MAX || 100000);
const FRONTEND_URL =
  process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
const SUCCESS_PATH = process.env.DONATION_SUCCESS_PATH || "/donate/success";
const CANCEL_PATH = process.env.DONATION_CANCEL_PATH || "/donate/cancel";
const MONTHLY_PRODUCT_ID = process.env.STRIPE_MONTHLY_PRODUCT_ID; // required for subscriptions

// --- Simple Donation model (optional, keeps a record) ---
const donationSchema = new mongoose.Schema(
  {
    amount: Number, // dollars
    currency: { type: String, default: "usd" },
    frequency: {
      type: String,
      enum: ["one-time", "monthly"],
      default: "one-time",
    },
    email: String,
    note: String,
    stripe_session_id: String,
    stripe_payment_intent: String,
    stripe_subscription_id: String,
    stripe_customer_id: String,
    donor_name: String,
    status: { type: String, default: "pending" },
  },
  { timestamps: true }
);

const Donation =
  mongoose.models.Donation || mongoose.model("Donation", donationSchema);

// --- Utils ---
function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}
function dollarsToCents(x) {
  return Math.round(Number(x) * 100);
}
function normalizeCurrency(input) {
  if (input == null) return null;
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const cleaned = input.replace(/[^0-9.\-]/g, ""); // drop $, commas, spaces
    if (cleaned === "" || cleaned === "." || cleaned === "-") return null;
    return Number(cleaned);
  }
  return null;
}
function sanitizeAmount(input) {
  const normalized = normalizeCurrency(input);
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return clamp(n, MIN_DOLLARS, MAX_DOLLARS);
}

// ---------- Customer Portal (manage monthly subscriptions) ----------
router.post("/portal", async (req, res) => {
  try {
    const { sessionId, customerId, returnUrl } = req.body || {};
    let customer = customerId;
    if (!customer && sessionId) {
      const s = await stripe.checkout.sessions.retrieve(sessionId);
      customer = s.customer;
    }
    if (!customer)
      return res.status(400).json({ error: "Missing customerId or sessionId" });

    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: returnUrl || `${FRONTEND_URL}${SUCCESS_PATH}`,
    });
    res.json({ url: portal.url });
  } catch (e) {
    console.error("portal error", e);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

// ---------- Stripe webhook ----------
// Keep body RAW here. See top comment regarding mount order.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;
    try {
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const filter = {
            $or: [
              { stripe_session_id: session.id },
              ...(session.payment_intent
                ? [{ stripe_payment_intent: session.payment_intent }]
                : []),
              ...(session.subscription
                ? [{ stripe_subscription_id: session.subscription }]
                : []),
            ],
          };
          const update = {
            $set: {
              status: "paid",
              // Ensure we always store current identifiers
              stripe_session_id: session.id,
              stripe_payment_intent: session.payment_intent || undefined,
              stripe_subscription_id: session.subscription || undefined,
              email: session.customer_details?.email || undefined,
              amount: session.amount_total
                ? session.amount_total / 100
                : undefined,
              currency: session.currency || "usd",
              // Derive frequency from session.mode
              frequency:
                session.mode === "subscription" ? "monthly" : "one-time",
              stripe_customer_id: session.customer || undefined,
              donor_name: session.metadata?.donor_name || undefined,
            },
            $setOnInsert: {
              // If the pre-checkout insert never happened, at least capture a minimal record
              note: session.metadata?.note || "",
            },
          };
          await Donation.findOneAndUpdate(filter, update, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          });
          break;
        }
        case "invoice.paid": {
          // Handle subscription renewal if desired
          break;
        }
        case "charge.refunded": {
          // Handle refunds if needed
          break;
        }
        default:
          // Unhandled event types can be ignored
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error", err);
      res.status(500).send("Webhook handler failed");
    }
  }
);
// ---------- Health (dev) ----------
router.get("/health", (req, res) => res.json({ ok: true }));

// ✅ JSON parser for non-webhook routes within this router
// (Keeps webhook raw; parses JSON for everything else regardless of global middleware order)
router.use((req, res, next) => {
  if (req.path === "/webhook") return next();
  return express.json()(req, res, next);
});

// ---------- One-time donation ----------
router.post("/checkout", async (req, res) => {
  try {
    const {
      amount,
      tierAmount,
      donationAmount,
      finalAmount,
      amount_cents,
      amountInCents,
      email,
      name,
      note,
      successUrl,
      cancelUrl,
    } = req.body || {};
    // Accept multiple client keys for flexibility
    let rawAmount = amount ?? tierAmount ?? donationAmount ?? finalAmount;
    // Support amounts provided in cents
    if (rawAmount == null && (amount_cents != null || amountInCents != null)) {
      const cents = Number(amount_cents ?? amountInCents);
      if (Number.isFinite(cents)) rawAmount = cents / 100;
    }
    const dollars = sanitizeAmount(rawAmount);
    if (!dollars) {
      console.warn("Invalid amount payload:", { body: req.body, rawAmount });
      return res.status(400).json({ error: "Invalid amount" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"], // Apple/Google Pay auto-included
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Donation — The Way of Messiah",
              description: note ? String(note).slice(0, 490) : undefined,
            },
            unit_amount: dollarsToCents(dollars),
          },
          quantity: 1,
        },
      ],
      success_url:
        successUrl ||
        `${FRONTEND_URL}${SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}${CANCEL_PATH}`,
      metadata: { frequency: "one-time", donor_name: name || "" },
    });

    // Optional: create a local record
    try {
      await Donation.create({
        amount: dollars,
        donor_name: name || "",
        donor_name: name || "",
        email,
        note,
        stripe_session_id: session.id,
        frequency: "one-time",
        status: "created",
      });
    } catch (e) {
      // Non-fatal if DB is not connected
      console.warn("Donation.create skipped/failed:", e.message);
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("checkout error", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});
// ---------- Monthly (subscription) ----------
// Requires STRIPE_MONTHLY_PRODUCT_ID to be set to a single Product ID in your Stripe account
router.post("/subscription", async (req, res) => {
  try {
    const { tierAmount, email, name, note, successUrl, cancelUrl } =
      req.body || {};
    if (!MONTHLY_PRODUCT_ID)
      return res
        .status(500)
        .json({ error: "Missing STRIPE_MONTHLY_PRODUCT_ID" });

    const dollars = sanitizeAmount(tierAmount);
    if (!dollars) return res.status(400).json({ error: "Invalid amount" });

    // Create a dynamic monthly price under the shared product
    const price = await stripe.prices.create({
      unit_amount: dollarsToCents(dollars),
      currency: "usd",
      recurring: { interval: "month" },
      product: MONTHLY_PRODUCT_ID,
      nickname: `$${dollars}/mo`,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [{ price: price.id, quantity: 1 }],
      allow_promotion_codes: false,
      success_url:
        successUrl ||
        `${FRONTEND_URL}${SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}${CANCEL_PATH}`,
      metadata: { frequency: "monthly", note: note || "" },
    });

    try {
      await Donation.create({
        amount: dollars,
        email,
        note,
        stripe_session_id: session.id,
        frequency: "monthly",
        status: "created",
      });
    } catch (e) {
      console.warn("Donation.create (sub) skipped/failed:", e.message);
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("subscription error", err);
    res.status(500).json({ error: "Failed to create subscription session" });
  }
});
// ---------- Session lookup (for /donate/success?session_id=...) ----------
// GET /api/donations/session/:id
router.get("/session/:id", async (req, res) => {
  try {
    const s = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ["payment_intent"],
    });

    // Try to enrich with your local Donation record (safe even if not found)
    let donorName = null,
      note = null;
    try {
      const doc = await Donation.findOne({ stripe_session_id: s.id }).lean();
      if (doc) {
        donorName = doc.donor_name ?? null;
        note = doc.note ?? null;
      }
    } catch (e) {
      // Non-fatal if DB isn’t connected during dev
    }

    res.json({
      id: s.id,
      amount_total: s.amount_total, // cents
      currency: s.currency,
      email: s.customer_details?.email,
      frequency: s.mode === "subscription" ? "monthly" : "one-time",
      payment_status: s.payment_status,
      donor_name: donorName,
      note,
    });
  } catch (e) {
    res.status(404).json({ error: "Session not found" });
  }
});
// POST /api/donations/reconcile  { sessionId: 'cs_test_...' }
router.post("/reconcile", async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    const s = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    if (s.payment_status !== "paid") {
      return res.json({
        ok: true,
        updated: false,
        reason: `payment_status=${s.payment_status}`,
      });
    }

    const filter = {
      $or: [
        { stripe_session_id: s.id },
        ...(s.payment_intent
          ? [{ stripe_payment_intent: s.payment_intent }]
          : []),
        ...(s.subscription ? [{ stripe_subscription_id: s.subscription }] : []),
      ],
    };
    const update = {
      $set: {
        status: "paid",
        stripe_session_id: s.id,
        stripe_payment_intent: s.payment_intent || undefined,
        stripe_subscription_id: s.subscription || undefined,
        email: s.customer_details?.email || undefined,
        amount: s.amount_total ? s.amount_total / 100 : undefined,
        currency: s.currency || "usd",
        frequency: s.mode === "subscription" ? "monthly" : "one-time",
      },
      $setOnInsert: { note: "" },
    };

    const doc = await Donation.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    res.json({ ok: true, updated: true, doc });
  } catch (e) {
    console.error("reconcile error", e);
    res.status(500).json({
      error: "Reconcile failed",
      message: e.message,
      type: e.type,
      code: e.code,
      raw: e.raw?.message,
    });
  }
});
// GET /api/donations/reconcile/:sessionId
router.get('/reconcile/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
    const paid = s.payment_status === 'paid';

    if (!paid) return res.json({ ok: true, updated: false, reason: `payment_status=${s.payment_status}` });

    const filter = {
      $or: [
        { stripe_session_id: s.id },
        ...(s.payment_intent ? [{ stripe_payment_intent: s.payment_intent }] : []),
        ...(s.subscription ? [{ stripe_subscription_id: s.subscription }] : []),
      ],
    };
    const update = {
      $set: {
        status: 'paid',
        stripe_session_id: s.id,
        stripe_payment_intent: s.payment_intent || undefined,
        stripe_subscription_id: s.subscription || undefined,
        email: s.customer_details?.email || undefined,
        amount: s.amount_total ? s.amount_total / 100 : undefined,
        currency: s.currency || 'usd',
        frequency: s.mode === 'subscription' ? 'monthly' : 'one-time',
      },
      $setOnInsert: { note: '' },
    };
    const doc = await Donation.findOneAndUpdate(filter, update, {
      new: true, upsert: true, setDefaultsOnInsert: true,
    });
    res.json({ ok: true, updated: true, doc });
  } catch (e) {
    console.error('reconcile GET error', e);
    res.status(500).json({ error: 'Reconcile failed' });
  }
});

module.exports = router;
