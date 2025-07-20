const express = require("express");
const router = express.Router();
const Testimony = require("../models/Testimony");
const fs = require("fs");
const path = require("path");
const verifyToken = require("../middleware/verifyToken");

// Public route to get approved testimonies
router.get('/', async (req, res) => {
  try {
    const approvedTestimonies = await Testimony.find({ approved: true }).sort({ createdAt: -1 });
    res.json(approvedTestimonies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch testimonies' });
  }
});

router.get("/admin/all", verifyToken, async(req, res) => {
    try {
        const testimonies = await Testimony.find().sort({ createdAt: -1 });
        res.json(testimonies);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch testimonies" });
    }
});
//code for protected routes
router.get("/protected", verifyToken, (req, res) => {
    res.json({ message: `Access granted for ${req.user.username}` });
});
//code with verify

router.get("/admin/ping", verifyToken, (req, res) => {
    res.json({ message: `Access granted for ${req.user.username}` });
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