const express = require("express");
const router = express.Router();
const Testimony = require("../models/Testimony");
const fs = require("fs");
const path = require("path");
const { verifyToken } = require("./admin");

router.get("/all", verifyToken, async(req, res) => {
    try {
        const testimonies = await Testimony.find().sort({ createdAt: -1 });
        res.json(testimonies);
    } catch (err) {
        res.status(500).json({ error: "Server error while fetching testimonies" });
    }
});
// PATCH /testimonies/:id/approve
router.patch("/:id/approve", async(req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;
        const updated = await Testimony.findByIdAndUpdate(
            id, { approved }, { new: true }
        );
        if (!updated)
            return res.status(404).json({ error: "Testimony not found." });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch testimonies" });
    }
});

// DELETE /testimonies/:id
router.delete("/:id", async(req, res) => {
    try {
        const { id } = req.params;
        const testimony = await Testimony.findById(id);
        if (!testimony) {
            return res.status(404).json({ error: "Testimony not found." });
        }

        // Delete image from server if exists
        if (testimony.imageUrl) {
            const imagePath = path.join(__dirname, "../public", testimony.imageUrl);
            fs.unlink(imagePath, (err) => {
                if (err) console.warn("⚠️ Failed to delete image:", err.message);
            });
        }

        await Testimony.findByIdAndDelete(id);
        res.status(200).json({ message: "Testimony deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete testimony." });
    }
});

module.exports = router;