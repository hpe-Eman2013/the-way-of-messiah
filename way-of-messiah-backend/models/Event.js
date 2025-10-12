// models/Event.js
const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    category: {
      type: String,
      enum: ["Feast", "Sabbath", "Gathering", "Teaching", "Other"],
      default: "Other",
    },

    // Store as UTC Dates
    startDate: { type: Date, required: true },
    endDate: { type: Date },

    // Display-only fields
    time: { type: String, default: "" }, // e.g., "6:30 PM – 8:00 PM"
    location: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },

    link: { type: String, default: "" }, // Zoom/stream/details

    // Publishing flags
    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Helpful indexes
EventSchema.index({ startDate: 1 });
EventSchema.index({ isPublished: 1, startDate: 1 });
EventSchema.index({ title: "text", description: "text", location: "text" });

module.exports = mongoose.models.Event || mongoose.model("Event", EventSchema);
