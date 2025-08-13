const express = require('express');
const mongoose = require('mongoose');
const { normalizeHolyDayDoc } = require('../utils/holyDayNormalize');
const { NAME_ALIASES, canonicalize } = require('../utils/holyDayNames');

const router = express.Router();

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findHolyDayByName(rawName) {
  const db = mongoose.connection.db;
  const coll = db.collection("Yahuah's-Holy-Days");
  const canon = canonicalize(rawName);
  const aliases = new Set([canon, ...(NAME_ALIASES[canon] || [])]);

  // Try exact/alias matches (case-insensitive)
  const orExact = [...aliases].map(a => ({ name: { $regex: new RegExp(`^${escapeRegex(a)}$`, 'i') } }));

  // Try long-form names with parentheses, e.g. "Feast of Weeks (Shavuot)"
  const parenRegex = new RegExp(`\\((?:${[...aliases].map(escapeRegex).join('|')})\\)`, 'i');

  let doc =
    await coll.findOne({ $or: orExact }) ||
    await coll.findOne({ name: { $regex: parenRegex } });

  return doc ? normalizeHolyDayDoc(doc) : null;
}

/**
 * GET /explanations?year=YYYY&month=1-12
 * If year+month present: returns explanations for that month’s events (plus Sabbath).
 * If not present: returns all explanations (normalized).
 */
router.get('/', async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    // If year+month are provided, drive explanations by the events collection
    if (year && month) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end   = new Date(Date.UTC(year, month, 1));

      const db = mongoose.connection.db;
      const events = await db.collection('events')
        .find({ date: { $gte: start, $lt: end }, name: { $exists: true } })
        .sort({ date: 1 })
        .toArray();

      const result = [];
      for (const ev of events) {
        const explanation = await findHolyDayByName(ev.name);
        result.push({
          date: ev.date,
          name: ev.name,
          explanation: explanation ?? {
            name: ev.name,
            purpose: '',
            length: '',
            restrictions: '',
            when_observed: '',
            who_it_was_binding_on: '',
            customs: '',
          },
        });
      }

      // Ensure Sabbath explanation shows even if Sabbath isn't stored as an event row
      const hasSabbathEvent = events.some(e => String(e.name).toLowerCase().includes('sabbath'));
      if (!hasSabbathEvent) {
        const sab = await findHolyDayByName('Sabbath');
        if (sab) result.push({ date: null, name: 'Sabbath', explanation: sab });
      }

      return res.json(result);
    }

    // Fallback: return ALL explanations (normalized)
    const coll = mongoose.connection.db.collection("Yahuah's-Holy-Days");
    const all = await coll.find({}).toArray();
    return res.json(all.map(normalizeHolyDayDoc));
  } catch (err) {
    console.error('Error fetching explanations:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
