// routes/adminRoutes.js

const express = require("express");
const router = express.Router();
const Testimony = require("../models/Testimony");
const verifyToken = require("../middleware/verifyToken");

// Approve a single testimony
router.patch("/testimonies/:id/approve", verifyToken, async (req, res) => {
  try {
    const testimony = await Testimony.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );
    if (!testimony) {
      return res.status(404).json({ message: "Testimony not found" });
    }
    res.json(testimony);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Disapprove a single testimony
router.patch("/testimonies/:id/disapprove", verifyToken, async (req, res) => {
  try {
    const testimony = await Testimony.findByIdAndUpdate(
      req.params.id,
      { approved: false },
      { new: true }
    );
    if (!testimony) {
      return res.status(404).json({ message: "Testimony not found" });
    }
    res.json(testimony);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
