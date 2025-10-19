// routes/calendarRoutes.js
const express = require("express");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const Event = require("../models/Event");

const router = express.Router();

// Quick probe so we know the router is mounted
router.get("/ping", (req, res) =>
  res.json({ ok: true, at: new Date().toISOString() })
);

/**
 * GET /api/calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns events where from <= startDate (UTC) < to
 */
router.get("/events", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "from and to are required (YYYY-MM-DD)" });
    }

    const fromUtc = dayjs.utc(from, "YYYY-MM-DD", true);
    const toUtc = dayjs.utc(to, "YYYY-MM-DD", true);
    if (!fromUtc.isValid() || !toUtc.isValid()) {
      return res
        .status(400)
        .json({ error: "Invalid from/to format. Use YYYY-MM-DD." });
    }

    // Query by your schema's primary date: startDate (UTC)
    const query = {
      isPublished: { $ne: false },
      startDate: { $gte: fromUtc.toDate(), $lt: toUtc.toDate() },
    };

    const docs = await Event.find(query).sort({ startDate: 1 }).lean();

    // Normalize to what the frontend expects
    const events = docs.map((d) => {
      const dateObj = d.startDate || d.date;
      const dateYmd = dateObj ? dayjs.utc(dateObj).format("YYYY-MM-DD") : null;

      let description = [];
      if (Array.isArray(d.description)) description = d.description.map(String);
      else if (d.description != null) description = [String(d.description)];

      return {
        _id: d._id?.toString?.() ?? d._id,
        title: d.title ?? "",
        description,
        category: d.category ?? "Other",
        dateYmd,
        date: dateObj ?? null,
        isPublished: d.isPublished !== false,
      };
    });

    res.json(events);
  } catch (err) {
    console.error("GET /api/calendar/events failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
