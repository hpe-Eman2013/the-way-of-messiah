const express = require("express");
const router = express.Router();
const Testimony = require("../models/Testimony");

// GET /testimonies - only approved ones
router.get("/", async(req, res) => {
    try {
        const testimonies = await Testimony.find({ approved: true }).sort({
            createdAt: -1,
        });
        res.json(testimonies);
    } catch (err) {
        res.status(500).json({ error: "Server error while fetching testimonies" });
    }
});

module.exports = router;