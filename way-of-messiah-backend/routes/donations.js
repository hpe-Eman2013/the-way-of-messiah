// routes/donations.js (CommonJS)
// Unified Stripe donations router — one‑time + monthly. Ready for quarterly/semi‑annual/annual via utils/frequencyMap.
// IMPORTANT: This router keeps /webhook RAW and parses JSON for all other routes.
// Mount order in server.js:
//   const donationsRouter = require("./routes/donations");
//   app.use("/donations", donationsRouter);

const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const Stripe = require("stripe");

// ✅ Use the extracted model file you just created
const Donation = require("../models/Donation");

// Optional helper (present if you add recurring cadences beyond monthly)
let mapFrequencyToStripeInterval;
try {
  ({ mapFrequencyToStripeInterval } = require("../utils/frequencyMap"));
} catch (_) {
  mapFrequencyToStripeInterval = () => null; // fallback: one‑time only
}

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

// --- Config ---
const MIN_DOLLARS = Number(process.env.DONATION_MIN || 1);
const MAX_DOLLARS = Number(process.env.DONATION_MAX || 100000);
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
const SUCCESS_PATH = process.env.DONATION_SUCCESS_PATH || "/donate/thank-you";
const CANCEL_PATH = process.env.DONATION_CANCEL_PATH || "/donate/cancel";
const MONTHLY_PRODUCT_ID = process.env.STRIPE_MONTHLY_PRODUCT_ID; // used by /subscription

// --- Utils ---
function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }
function dollarsToCents(x) { return Math.round(Number(x) * 100); }
function normalizeCurrency(input) {
  if (input == null) return null;
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const cleaned = input.replace(/[^0-9.\-]/g, "");
    if (!cleaned || cleaned === "." || cleaned === "-") return null;
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

// ---------- Customer Portal (for managing subscriptions) ----------
router.post("/portal", async (req, res) => {
  try {
    const { sessionId, customerId, returnUrl } = req.body || {};
    let customer = customerId;
    if (!customer && sessionId) {
      const s = await stripe.checkout.sessions.retrieve(sessionId);
      customer = s.customer;
    }
    if (!customer) return res.status(400).json({ error: "Missing customerId or sessionId" });

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

// ---------- Stripe Webhook (RAW body) ----------
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
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
            { stripe_session_id: session.id }, // legacy field matching
            { checkoutSessionId: session.id },
            ...(session.payment_intent ? [{ stripe_payment_intent: session.payment_intent }] : []),
            ...(session.subscription ? [{ stripe_subscription_id: session.subscription }] : []),
          ],
        };

        const update = {
          $set: {
            status: "paid",
            checkoutSessionId: session.id,
            paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
            subscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
            customerId: typeof session.customer === "string" ? session.customer : undefined,
            email: session.customer_details?.email || undefined,
            amount: session.amount_total ? session.amount_total / 100 : undefined, // dollars
            currency: session.currency || "usd",
            frequency: (session.metadata && session.metadata.frequency) ? session.metadata.frequency : (session.mode === "subscription" ? "monthly" : "one-time"),

            // legacy mirrors (optional)
            stripe_session_id: session.id,
            stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
            stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : undefined,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : undefined,
          },
          $setOnInsert: { note: session.metadata?.note || "" },
        };

        await Donation.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: true });
        break;
      }

      case "invoice.paid": {
        // Subscription renewal; you can log or aggregate here if desired.
        break;
      }

      // Add more cases (refunds, disputes) as needed
      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).send("Webhook handler failed");
  }
});

// ---------- Health (dev) ----------
// 🔹 Self-test endpoint
router.get("/ping", (req, res) => {
  res.json({ ok: true, base: "/donations" });
});
router.get("/health", (req, res) => res.json({ ok: true }));

// ✅ JSON parser for all non‑webhook routes inside this router
router.use((req, res, next) => {
  if (req.path === "/webhook") return next(); // keep raw for webhook
  return express.json()(req, res, next);
});

// ---------- Unified create-checkout-session (one-time + recurring) ----------
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { amount, currency = "usd", frequency = "one-time", email, name, note, successUrl, cancelUrl } = req.body || {};

    const dollars = sanitizeAmount(amount);
    if (!dollars) return res.status(400).json({ error: "Invalid amount" });

    const recurring = mapFrequencyToStripeInterval ? mapFrequencyToStripeInterval(frequency) : null;

    const sessionParams = {
      success_url: successUrl || `${FRONTEND_URL}${SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}${CANCEL_PATH}`,
      customer_email: email || undefined,
      metadata: { frequency, donor_name: name || "", note: note || "" },
    };

    if (recurring) {
      sessionParams.mode = "subscription";
      sessionParams.line_items = [
        {
          price_data: {
            currency,
            product_data: { name: "Recurring Donation" },
            recurring,
            unit_amount: dollarsToCents(dollars),
          },
          quantity: 1,
        },
      ];
    } else {
      sessionParams.mode = "payment";
      sessionParams.line_items = [
        {
          price_data: {
            currency,
            product_data: { name: "One-Time Donation" },
            unit_amount: dollarsToCents(dollars),
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    try {
      await Donation.create({
        amount: dollars,
        currency,
        donor_name: name || "",
        email,
        note,
        checkoutSessionId: session.id,
        stripe_session_id: session.id,
        frequency,
        status: "created",
      });
    } catch (e) {
      console.warn("Donation.create skipped/failed:", e.message);
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("create-checkout-session error", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/checkout", async (req, res) => {
  try {
    const { amount, tierAmount, donationAmount, finalAmount, amount_cents, amountInCents, email, name, note, successUrl, cancelUrl } = req.body || {};

    let rawAmount = amount ?? tierAmount ?? donationAmount ?? finalAmount;
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
      payment_method_types: ["card"],
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
      success_url: successUrl || `${FRONTEND_URL}${SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}${CANCEL_PATH}`,
      metadata: { frequency: "one-time", donor_name: name || "" },
    });

    try {
      await Donation.create({
        amount: dollars, // dollars in DB
        donor_name: name || "",
        email,
        note,
        checkoutSessionId: session.id,
        stripe_session_id: session.id, // legacy mirror
        frequency: "one-time",
        status: "created",
      });
    } catch (e) {
      console.warn("Donation.create skipped/failed:", e.message);
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("checkout error", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ---------- Monthly subscription ----------
router.post("/subscription", async (req, res) => {
  try {
    const { tierAmount, email, name, note, successUrl, cancelUrl } = req.body || {};
    if (!MONTHLY_PRODUCT_ID) return res.status(500).json({ error: "Missing STRIPE_MONTHLY_PRODUCT_ID" });

    const dollars = sanitizeAmount(tierAmount);
    if (!dollars) return res.status(400).json({ error: "Invalid amount" });

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
      success_url: successUrl || `${FRONTEND_URL}${SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}${CANCEL_PATH}`,
      metadata: { frequency: "monthly", note: note || "", donor_name: name || "" },
    });

    try {
      await Donation.create({
        amount: dollars, // dollars
        email,
        note,
        checkoutSessionId: session.id,
        stripe_session_id: session.id, // legacy mirror
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

// ---------- Session lookup for Thank‑You page ----------
router.get("/session/:id", async (req, res) => {
  try {
    const s = await stripe.checkout.sessions.retrieve(req.params.id, { expand: ["payment_intent"] });

    let donorName = null, note = null;
    try {
      const doc = await Donation.findOne({ $or: [{ stripe_session_id: s.id }, { checkoutSessionId: s.id }] }).lean();
      if (doc) { donorName = doc.donor_name ?? null; note = doc.note ?? null; }
    } catch (_) {}

    res.json({
      id: s.id,
      amount_total: s.amount_total, // cents
      currency: s.currency,
      email: s.customer_details?.email,
      frequency: (s.metadata && s.metadata.frequency) ? s.metadata.frequency : (s.mode === "subscription" ? "monthly" : "one-time"),
      payment_status: s.payment_status,
      donor_name: donorName,
      note,
    });
  } catch (e) {
    res.status(404).json({ error: "Session not found" });
  }
});

// ---------- Reconcile helpers ----------
router.post("/reconcile", async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    if (s.payment_status !== "paid") return res.json({ ok: true, updated: false, reason: `payment_status=${s.payment_status}` });

    const filter = {
      $or: [
        { stripe_session_id: s.id },
        { checkoutSessionId: s.id },
        ...(s.payment_intent ? [{ stripe_payment_intent: s.payment_intent }] : []),
        ...(s.subscription ? [{ stripe_subscription_id: s.subscription }] : []),
      ],
    };
    const update = {
      $set: {
        status: "paid",
        checkoutSessionId: s.id,
        stripe_session_id: s.id,
        stripe_payment_intent: s.payment_intent || undefined,
        stripe_subscription_id: s.subscription || undefined,
        email: s.customer_details?.email || undefined,
        amount: s.amount_total ? s.amount_total / 100 : undefined,
        currency: s.currency || "usd",
        frequency: (s.metadata && s.metadata.frequency) ? s.metadata.frequency : (s.mode === "subscription" ? "monthly" : "one-time"),
      },
      $setOnInsert: { note: "" },
    };
    const doc = await Donation.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json({ ok: true, updated: true, doc });
  } catch (e) {
    console.error("reconcile error", e);
    res.status(500).json({ error: "Reconcile failed", message: e.message });
  }
});

router.get("/reconcile/:sessionId", async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const s = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    if (s.payment_status !== "paid") return res.json({ ok: true, updated: false, reason: `payment_status=${s.payment_status}` });

    const filter = {
      $or: [
        { stripe_session_id: s.id },
        { checkoutSessionId: s.id },
        ...(s.payment_intent ? [{ stripe_payment_intent: s.payment_intent }] : []),
        ...(s.subscription ? [{ stripe_subscription_id: s.subscription }] : []),
      ],
    };
    const update = {
      $set: {
        status: "paid",
        checkoutSessionId: s.id,
        stripe_session_id: s.id,
        stripe_payment_intent: s.payment_intent || undefined,
        stripe_subscription_id: s.subscription || undefined,
        email: s.customer_details?.email || undefined,
        amount: s.amount_total ? s.amount_total / 100 : undefined,
        currency: s.currency || "usd",
        frequency: (s.metadata && s.metadata.frequency) ? s.metadata.frequency : (s.mode === "subscription" ? "monthly" : "one-time"),
      },
      $setOnInsert: { note: "" },
    };
    const doc = await Donation.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json({ ok: true, updated: true, doc });
  } catch (e) {
    console.error("reconcile GET error", e);
    res.status(500).json({ error: "Reconcile failed" });
  }
});

module.exports = router;
