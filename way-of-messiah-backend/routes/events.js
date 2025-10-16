// routes/events.js
const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const verifyToken = require("../middleware/verifyToken"); // protect admin-only ops

// ✅ parse JSON and form bodies for this router only
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// List (search/filter/paginate)
// for testing 
router.get("/ping", (req, res) => res.json({ ok: true }));
// regular list
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
    // 👇 Optional: only published when ?published=1 is present
    if (req.query.published) q.isPublished = true;

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
// Get /events/published
router.get("/events", async (req, res) => {
  try {
    const docs = await Event.find({ isPublished: true }).lean();

    const out = docs.map(e => ({
      id: e.id.toString() ?? e._id.toString(),
      title: e.title,
      category: e.category,
      description: e.description ?? "",
      location: e.location ?? "",
      link: e.link ?? "",
      time: e.time ?? "",

      // Canonical, timezone-safe day fields for the calendar grid:
      dateISO: e.date ? new Date(e.date).toISOString() : null,
      dateYmd: e.date ? new Date(e.date).toISOString().slice(0, 10) : null,

      // Only include timed fields if they actually exist (for announcements)
      ...(e.startDate ? { startDateISO: new Date(e.startDate).toISOString() } : {}),
      ...(e.endDate   ? { endDateISO:   new Date(e.endDate).toISOString() } : {}),
      ...(e.timezone  ? { timezone: e.timezone } : {}),
    }));

    res.json(out);
  } catch (err) {
    console.error("GET /events failed:", err);
    res.status(500).json({ error: "Failed to load events" });
  }
});
// Create (admin only)
router.post("/", verifyToken, async (req, res) => {
  try {
    // Expect startDate/endDate as ISO; Admin form already converts local->UTC
    const doc = await Event.create(req.body);
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message || "Create failed" });
  }
});

// Update (admin only)
router.put("/:id", verifyToken, async (req, res) => {
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

// Delete (admin only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await Event.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Delete failed" });
  }
});

module.exports = router;
