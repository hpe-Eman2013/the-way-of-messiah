const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name: String,
  date: Date, // << THIS MUST BE Date — not String
  time: String,
  location: String,
  description: [String], // ✅ Make description an array
  link: String,
}, { timestamps: true });

module.exports = mongoose.model("Event", eventSchema);
