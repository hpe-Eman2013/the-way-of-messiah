const express = require('express');
const mongoose = require('mongoose');
const { normalizeHolyDayDoc } = require('../utils/holyDayNormalize');
const { NAME_ALIASES, canonicalize } = require('../utils/holyDayNames');

const router = express.Router();

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// NEW: helper – is this name a holy day (feast or sabbath), not "Day 73" etc.?
function isHolyDayName(rawName = '') {
  const n = String(rawName).trim().toLowerCase();

  // filter out "day 73" style records
  if (/^day\s*\d+$/.test(n)) return false;

  // explicit sabbath
  if (n.includes('sabbath') || n.includes('weekly sabbath')) return true;

  // anything that looks like a feast
  if (n.includes('feast') || n.includes('passover') || n.includes('unleavened') ||
      n.includes('trumpets') || n.includes('atonement') || n.includes('tabernacles') ||
      n.includes('sukkot') || n.includes('hanukkah') || n.includes('dedication') ||
      n.includes('shavuot') || n.includes('pentecost') || n.includes('pesach') ||
      n.includes('yom teruah') || n.includes('yom kippur')) return true;

  // fall back to our alias table
  const canon = canonicalize(n);
  return Boolean(NAME_ALIASES[canon]);
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
    const year  = Number(req.query.year);
    const month = Number(req.query.month);

    // If not driving by month, return ALL normalized docs (legacy)
    if (!year || !month) {
      const coll = mongoose.connection.db.collection("Yahuah's-Holy-Days");
      const all = await coll.find({}).toArray();
      return res.json(all.map(normalizeHolyDayDoc));
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end   = new Date(Date.UTC(year, month, 1));
    const db = mongoose.connection.db;

    const events = await db.collection('events')
      .find({ date: { $gte: start, $lt: end }, name: { $exists: true } })
      .sort({ date: 1 })
      .toArray();

    const result = [];

    for (const ev of events) {
      // 🚫 Skip regular day records like "Day 73"
      if (!isHolyDayName(ev.name)) continue;

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

    // ✅ Always include Sabbath explanation once per month
    const alreadyHasSabbath = result.some(r => String(r.name).toLowerCase().includes('sabbath'));
    if (!alreadyHasSabbath) {
      const sab = await findHolyDayByName('Sabbath');
      if (sab) result.push({ date: null, name: 'Sabbath', explanation: sab });
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching explanations:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
