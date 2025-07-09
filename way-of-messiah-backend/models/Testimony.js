// models/Testimony.js
const mongoose = require("mongoose");

const TestimonySchema = new mongoose.Schema({
  name: String,
  email: String, // Optional for future
  message: { type: String, required: true },
  imageUrl: String,
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Testimony", TestimonySchema);
