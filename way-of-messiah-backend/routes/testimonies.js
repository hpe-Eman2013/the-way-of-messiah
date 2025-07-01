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
        console.error("Error fetching testimonies:", err);
        res.status(500).json({ error: "Server error while fetching testimonies" });
    }
});
// PATCH /testimonies/:id/approve
router.patch("/:id/approve", async(req, res) => {
    const { id } = req.params;
    const { approved } = req.body;

    try {
        const updated = await Testimony.findByIdAndUpdate(
            id, { approved }, { new: true }
        );
        if (!updated) {
            return res.status(404).json({ error: "Testimony not found" });
        }
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update approval status" });
    }
});

module.exports = router;