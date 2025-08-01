const express = require("express");
const router = express.Router();
const Event = require("../models/Event");

// GET all events
router.get("/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: "Failed to load events." });
  }
});

module.exports = router;
