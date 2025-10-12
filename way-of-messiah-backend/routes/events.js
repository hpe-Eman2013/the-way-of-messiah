// routes/events.js
const express = require("express");
const router = express.Router();
const Event = require("../models/Event");

// List with basic search/filter/pagination
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit || "20", 10))
    );
    const q = {};
    if (req.query.search) {
      q.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { location: { $regex: req.query.search, $options: "i" } },
      ];
    }
    if (req.query.category) q.category = req.query.category;

    const [items, total] = await Promise.all([
      Event.find(q)
        .sort({ startDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Event.countDocuments(q),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: "Failed to list events" });
  }
});

// Get one
router.get("/:id", async (req, res) => {
  try {
    const doc = await Event.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

// Create (protect this with your admin middleware if you have one)
router.post("/", async (req, res) => {
  try {
    const doc = await Event.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message || "Create failed" });
  }
});

// Update
router.put("/:id", async (req, res) => {
  try {
    const doc = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message || "Update failed" });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const doc = await Event.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Delete failed" });
  }
});

module.exports = router;
