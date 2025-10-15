// routes/adminCalendar.js
const router = require("express").Router();
const dayjs = require("dayjs");
const verifyToken = require("../middleware/verifyToken");
const Event = require("../models/Event");

router.post("/calendar/seed", verifyToken, async (req, res) => {
  const { year, equinox } = req.body; // YYYY, YYYY-MM-DD
  if (!year || !equinox) return res.status(400).json({ error: "year and equinox required" });
  const y = parseInt(year, 10);
  const day1 = dayjs(equinox).add(1, "day").startOf("day");

  const bulk = [];
  for (let i = 1; i <= 364; i++) {
    bulk.push({
      updateOne: {
        filter: { year: y, dayNumber: i },
        update: {
          $setOnInsert: { category: "Calendar" },
          $set: { title: `Day ${i}`, year: y, dayNumber: i, startDate: day1.add(i - 1, "day").toDate(), isPublished: true }
        },
        upsert: true
      }
    });
  }
  await Event.bulkWrite(bulk, { ordered: false });
  res.json({ ok: true, message: `Seeded ${y}` });
});

module.exports = router;
