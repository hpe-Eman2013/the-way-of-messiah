// routes/testimonyRoutes.js

const express = require("express");
const router = express.Router();
const Testimony = require("../models/Testimony");

// Create a new testimony
router.post("/submit", async (req, res) => {
  try {
    const { name, message, imageUrl } = req.body;

    const newTestimony = new Testimony({
      name,
      message,
      imageUrl,
      approved: false,
    });

    const saved = await newTestimony.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all testimonies (optionally filter by approval)
router.get("/testimonies", async (req, res) => {
  try {
    const { approved } = req.query;
    const filter = approved === "true" ? { approved: true } : {};
    const testimonies = await Testimony.find(filter).sort({ createdAt: -1 });
    res.json(testimonies);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
