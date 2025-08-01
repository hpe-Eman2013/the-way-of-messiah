const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name: String,
  date: String,
  time: String,
  location: String,
  description: String,
  link: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Event", eventSchema);
