// routes/calendarRoutes.js
const express = require("express");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const Event = require("../models/Event"); // <- your model

const router = express.Router();

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

    // Parse as strict UTC YMD
    const fromUtc = dayjs.utc(from, "YYYY-MM-DD", true);
    const toUtc = dayjs.utc(to, "YYYY-MM-DD", true);
    if (!fromUtc.isValid() || !toUtc.isValid()) {
      return res
        .status(400)
        .json({ error: "Invalid from/to format. Use YYYY-MM-DD." });
    }

    // Query by startDate (your schema’s main field), optional isPublished
    const query = {
      isPublished: { $ne: false },
      startDate: { $gte: fromUtc.toDate(), $lt: toUtc.toDate() }, // inclusive/exclusive
    };

    const docs = await Event.find(query).sort({ startDate: 1 }).lean();

    // Normalize for the frontend
    const events = docs.map((d) => {
      const dateObj = d.startDate || d.date; // prefer startDate, fall back to date if present
      const dateYmd = dateObj ? dayjs.utc(dateObj).format("YYYY-MM-DD") : null;

      // Ensure description is an array of strings
      let description = [];
      if (Array.isArray(d.description)) {
        description = d.description.map(String);
      } else if (d.description != null) {
        description = [String(d.description)];
      }

      return {
        _id: d._id?.toString?.() ?? d._id,
        title: d.title ?? "",
        description,
        category: d.category ?? "Other",
        dateYmd, // <-- what the frontend groups on
        date: dateObj ?? null, // optional, for reference
        isPublished: d.isPublished !== false,
      };
    });

    res.json(events); // array (frontend also tolerates {events:[…]}, but array is simplest)
  } catch (err) {
    console.error("GET /api/calendar/events failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
