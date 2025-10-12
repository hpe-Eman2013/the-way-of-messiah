// models/Event.js
const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: ["Feast", "Sabbath", "Gathering", "Teaching", "Other"],
      default: "Other",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    time: String,
    location: String,
    address: String,
    city: String,
    state: String,
    country: String,
    link: String,
    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Event || mongoose.model("Event", EventSchema);
