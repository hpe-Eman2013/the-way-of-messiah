// routes/explanations.js
const express = require('express');
const mongoose = require('mongoose');
const { normalizeHolyDayDoc } = require('../utils/holyDayNormalize');
const { NAME_ALIASES, canonicalize } = require('../utils/holyDayNames');

const router = express.Router();
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- text matchers (name or description) ---
const FEAST_RE = /(feast|passover|pesach|unleavened|firstfruits|trumpets|yom teruah|atonement|yom kippur|tabernacles|sukkot|sukkoth|sukkos|booths|shavuot|pentecost|dedication|hanukkah)/i;

const SABBATH_RE = /sabbath/i;

// normalize label like "Feast of Tabernacles (Sukkot) Start" -> "feast of tabernacles"
function normalizeFeastTag(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/\(.*?\)/g, '')     // strip anything in parentheses first
    .replace(/\s+(start|end)$/i, '') // then strip trailing Start/End
    .replace(/\s+/g, ' ')
    .trim();
}


function pickHolyTextFromEvent(ev) {
  // Check name
  if (typeof ev.name === 'string') {
    const n = ev.name;
    if (SABBATH_RE.test(n)) return { type: 'sabbath', raw: n, tag: 'sabbath' };
    if (FEAST_RE.test(n))   return { type: 'feast',   raw: n, tag: normalizeFeastTag(n) };
  }
  // Check description (string)
  if (typeof ev.description === 'string') {
    const d = ev.description;
    if (SABBATH_RE.test(d)) return { type: 'sabbath', raw: d, tag: 'sabbath' };
    if (FEAST_RE.test(d))   return { type: 'feast',   raw: d, tag: normalizeFeastTag(d) };
  }
  // Check description (array)
  if (Array.isArray(ev.description)) {
    for (const entry of ev.description) {
      if (typeof entry !== 'string') continue;
      if (SABBATH_RE.test(entry)) return { type: 'sabbath', raw: entry, tag: 'sabbath' };
      if (FEAST_RE.test(entry))   return { type: 'feast',   raw: entry, tag: normalizeFeastTag(entry) };
    }
  }
  return null;
}

async function findHolyDayByName(rawName) {
  const db = mongoose.connection.db;
  const coll = db.collection("Yahuah's-Holy-Days");
  const canon = canonicalize(rawName);
  const aliases = new Set([canon, ...(NAME_ALIASES[canon] || [])]);

  const exact   = [...aliases].map(a => ({ name: { $regex: new RegExp(`^${escRe(a)}$`, 'i') } }));
  const paren   = new RegExp(`\\((?:${[...aliases].map(escRe).join('|')})\\)`, 'i');
  const contains= new RegExp(`\\b(?:${[...aliases].map(escRe).join('|')})\\b`, 'i');

  let doc = await coll.findOne({ $or: exact });
  if (!doc) doc = await coll.findOne({ name: { $regex: paren } });
  if (!doc) doc = await coll.findOne({ name: { $regex: contains } });
  if (!doc && /sabbath/i.test(rawName)) doc = await coll.findOne({ name: { $regex: /sabbath/i } });

  return doc ? normalizeHolyDayDoc(doc) : null;
}

/** GET /api/explanations?year=YYYY&month=1-12 */
router.get('/', async (req, res) => {
  try {
    const year  = Number(req.query.year);
    const month = Number(req.query.month);

    // Fallback: return all normalized docs if no month provided
    if (!year || !month) {
      const coll = mongoose.connection.db.collection("Yahuah's-Holy-Days");
      const all = await coll.find({}).toArray();
      return res.json(all.map(normalizeHolyDayDoc));
    }

    // UTC month bounds
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end   = new Date(Date.UTC(year, month, 1));
    const db    = mongoose.connection.db;

    const events = await db.collection('events')
      .find({ date: { $gte: start, $lt: end }, name: { $exists: true } })
      .sort({ date: 1 })
      .toArray();

    // Collect one row per feast (dedupe multi-day feasts)
    const feastMap = new Map(); // key = normalized tag, value = {date, raw}
    for (const ev of events) {
      const picked = pickHolyTextFromEvent(ev);
      if (!picked) continue;

      if (picked.type === 'sabbath') {
        // skip; we add Sabbath explanation once below
        continue;
      }

      const key = picked.tag; // normalized feast tag
      if (!feastMap.has(key)) {
        feastMap.set(key, { date: ev.date, raw: picked.raw });
      } else {
        // keep earliest date
        if (new Date(ev.date) < new Date(feastMap.get(key).date)) {
          feastMap.set(key, { date: ev.date, raw: picked.raw });
        }
      }
    }

    // Build result from feastMap
    const result = [];
    for (const [tag, { date, raw }] of feastMap.entries()) {
      const explanation = await findHolyDayByName(tag) || await findHolyDayByName(raw);
      result.push({
        date,
        name: raw,              // show the human-friendly label found in the event
        explanation: explanation ?? {
          name: tag,
          purpose: '',
          length: '',
          restrictions: '',
          when_observed: '',
          who_it_was_binding_on: '',
          customs: '',
        },
      });
    }

    // Sort by date ascending
    result.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    // Inject Sabbath once per month
    const sab = await findHolyDayByName('Sabbath');
    if (sab) result.unshift({ date: null, name: 'Sabbath', explanation: sab });

    res.json(result);
  } catch (err) {
    console.error('Error fetching explanations:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
