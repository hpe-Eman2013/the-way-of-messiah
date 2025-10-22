// routes/calendarRoutes.js
const express = require("express");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const Event = require("../models/Event");
const router = express.Router();

// quick probe
router.get("/ping", (_req, res) => res.json({ ok: true }));

// GET /api/calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/events", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: "from and to are required (YYYY-MM-DD)" });
    }
    const fromUtc = dayjs.utc(from, "YYYY-MM-DD", true);
    const toUtc   = dayjs.utc(to,   "YYYY-MM-DD", true);
    if (!fromUtc.isValid() || !toUtc.isValid()) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
    }

    // Your schema’s primary date is startDate (UTC)
    const query = {
      isPublished: { $ne: false },
      date: { $gte: fromUtc.toDate(), $lt: toUtc.toDate() },
    };

    const docs = await Event.find(query).sort({ startDate: 1 }).lean();

    const events = docs.map((d) => ({
      _id: d._id.toString(),
      title: d.title || "",
      description: Array.isArray(d.description)
        ? d.description.map(String)
        : d.description ? [String(d.description)] : [],
      category: d.category || "Other",
      dateYmd: dayjs.utc(d.startDate || d.date).format("YYYY-MM-DD"),
        isPublished: d.isPublished !== false,
    }));

    res.json(events);
  } catch (err) {
    console.error("calendar/events error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
