// models/Donation.js
const mongoose = require("mongoose");

const DonationSchema = new mongoose.Schema(
  {
    // Core Stripe references (store as strings only)
    checkoutSessionId: { type: String, index: true },
    paymentIntentId:   { type: String, index: true },
    subscriptionId:    { type: String },
    customerId:        { type: String },

    // Payment details (store in DOLLARS to match your routes/UI)
    amount:   { type: Number }, // dollars
    currency: { type: String, default: "usd" },
    frequency: {
      type: String,
      enum: ["one-time", "monthly", "quarterly", "semi-annual", "annual"],
      default: "one-time",
    },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed", "refunded"],
      default: "created",
    },

    // Donor info
    donor_name: { type: String },
    email:      { type: String },
    note:       { type: String },

    // Card & receipt info (populated by webhook if you add it)
    brand:      { type: String },
    last4:      { type: String },
    receiptUrl: { type: String },

    // Optional misc metadata
    meta: { type: Object, default: {} },

    // Legacy fields (for any existing code/records still using these)
    stripe_session_id:      { type: String, index: true },
    stripe_payment_intent:  { type: String, index: true },
    stripe_subscription_id: { type: String },
    stripe_customer_id:     { type: String },
  },
  { timestamps: true }
);

// Avoid OverwriteModelError in dev
module.exports =
  mongoose.models.Donation || mongoose.model("Donation", DonationSchema);
