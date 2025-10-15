// backend/routes/adminCalendar.js
const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const dayjs = require('dayjs');
const { getDayOneUtc } = require('../utils/equinox');
const Event = require('../models/Event');

router.post('/calendar/seed', verifyToken, async (req, res) => {
  const { year, tz } = req.body || {};
  if (!year) return res.status(400).json({ error: 'year required' });

  const timeZone = tz || process.env.CALENDAR_TZ || 'America/New_York';
  const day1Utc = getDayOneUtc(parseInt(year, 10), timeZone);

  const ops = [];
  for (let i = 1; i <= 364; i++) {
    const start = dayjs(day1Utc).add(i - 1, 'day').toDate();
    ops.push({
      updateOne: {
        filter: { year: parseInt(year, 10), dayNumber: i },
        update: {
          $setOnInsert: { category: 'Calendar' },
          $set: { title: `Day ${i}`, year: parseInt(year, 10), dayNumber: i, startDate: start, isPublished: true },
        },
        upsert: true,
      },
    });
  }
  await Event.bulkWrite(ops, { ordered: false });
  res.json({ ok: true, seeded: ops.length, day1Utc });
});

module.exports = router;
