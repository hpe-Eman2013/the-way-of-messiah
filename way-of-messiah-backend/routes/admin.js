// routes/admin.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Testimony = require("../models/Testimony");
const verifyToken = require('../middleware/verifyToken');  // ✅ Import shared verifyToken

const router = express.Router();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

// Login endpoint
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
    console.log("🔐 Signing token with:", JWT_SECRET);
        return res.status(200).json({ token });
    }

    return res.status(401).json({ error: "Invalid login credentials." });
});

// From here down, all protected routes use imported verifyToken
router.get("/testimonies", verifyToken, async (req, res) => {
    try {
        const testimonies = await Testimony.find().sort({ createdAt: -1 });
        res.json(testimonies);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch testimonies" });
    }
});
// Admin Only Routes
// Protected route to approve/unapprove a testimony (admin only)
router.patch("/testimonies/:id/approve", verifyToken, async(req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;
        const updated = await Testimony.findByIdAndUpdate(id, { approved }, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update approval status." });
    }
});
// Protected route to delete a testimony (admin only)
router.delete("/testimonies/:id", verifyToken, async(req, res) => {
    try {
        const { id } = req.params;
        await Testimony.findByIdAndDelete(id);
        res.json({ message: "Testimony deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete testimony." });
    }
});
// General Routes
// ✅ Approve testimony
router.patch('/testimonies/:id/approve', verifyToken, async (req, res) => {
  try {
    const updated = await Testimony.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve testimony' });
  }
});

// ❌ Disapprove testimony
router.patch('/testimonies/:id/disapprove', verifyToken, async (req, res) => {
  try {
    const updated = await Testimony.findByIdAndUpdate(req.params.id, { approved: false }, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to disapprove testimony' });
  }
});

// 🗑️ Delete testimony
router.delete('/testimonies/:id', verifyToken, async (req, res) => {
  try {
    await Testimony.findByIdAndDelete(req.params.id);
    res.json({ message: 'Testimony deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete testimony' });
  }
});
router.get('/test', (req, res) => {
  res.send('Admin route is working');
});

module.exports = router;