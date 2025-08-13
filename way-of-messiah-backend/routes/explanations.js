const express = require('express');
const mongoose = require('mongoose');
const { normalizeHolyDayDoc } = require('../utils/holyDayNormalize');
const { NAME_ALIASES, canonicalize } = require('../utils/holyDayNames');

const router = express.Router();
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ----------------------------------------
// Matchers and helpers
// ----------------------------------------
const FEAST_RE = /(feast|passover|pesach|unleavened|firstfruits|trumpets|yom teruah|atonement|yom kippur|tabernacles|sukkot|sukkoth|sukkos|booths|shavuot|pentecost|dedication|hanukkah)/i;
const SABBATH_RE = /sabbath/i;

// normalize label like "Feast of Tabernacles Start (Sukkot)" -> "feast of tabernacles"
function normalizeFeastTag(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/\(.*?\)/g, '')        // strip anything in parentheses first
    .replace(/\s+/g, ' ')           // collapse repeated spaces
    .trim()                         // remove trailing space that blocked the next rule
    .replace(/\s+(start|end)\s*$/i, '') // then strip "start"/"end" (even if trailing spaces)
    .trim();
}


function pickHolyTextFromEvent(ev) {
  // name (string)
  if (typeof ev.name === 'string') {
    if (SABBATH_RE.test(ev.name)) return { type: 'sabbath', raw: ev.name, tag: 'sabbath' };
    if (FEAST_RE.test(ev.name))   return { type: 'feast',   raw: ev.name, tag: normalizeFeastTag(ev.name) };
  }
  // description (string)
  if (typeof ev.description === 'string') {
    if (SABBATH_RE.test(ev.description)) return { type: 'sabbath', raw: ev.description, tag: 'sabbath' };
    if (FEAST_RE.test(ev.description))   return { type: 'feast',   raw: ev.description, tag: normalizeFeastTag(ev.description) };
  }
  // description (array)
  if (Array.isArray(ev.description)) {
    for (const entry of ev.description) {
      if (typeof entry !== 'string') continue;
      if (SABBATH_RE.test(entry)) return { type: 'sabbath', raw: entry, tag: 'sabbath' };
      if (FEAST_RE.test(entry))   return { type: 'feast',   raw: entry, tag: normalizeFeastTag(entry) };
    }
  }
  return null;
}

// Search across name variants: name / Name / title / Title
async function findHolyDayByName(rawName) {
  const db = mongoose.connection.db;
  const coll = db.collection("Yahuah's-Holy-Days");
  const canon = canonicalize(rawName);
  const aliases = new Set([canon, ...(NAME_ALIASES[canon] || [])]);
  const fields = ['name','Name','title','Title'];
  const mkOr = (re) => ({ $or: fields.map(f => ({ [f]: { $regex: re } })) });

  // exact alias
  const exactList = [...aliases].map(a => new RegExp(`^${escRe(a)}$`, 'i'));
  let doc = await coll.findOne({ $or: exactList.map(re => mkOr(re)) });

  // with parentheses e.g. "(Sukkot)"
  if (!doc) {
    const paren = new RegExp(`\\((?:${[...aliases].map(escRe).join('|')})\\)`, 'i');
    doc = await coll.findOne(mkOr(paren));
  }
  // contains alias as a word
  if (!doc) {
    const contains = new RegExp(`\\b(?:${[...aliases].map(escRe).join('|')})\\b`, 'i');
    doc = await coll.findOne(mkOr(contains));
  }
  // last resort for sabbath
  if (!doc && /sabbath/i.test(rawName)) doc = await coll.findOne(mkOr(/sabbath/i));

  return doc ? normalizeHolyDayDoc(doc) : null;
}

// ----------------------------------------
// GET /api/explanations?year=YYYY&month=1-12
// ----------------------------------------
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

    // UTC month range
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end   = new Date(Date.UTC(year, month, 1));
    const db    = mongoose.connection.db;

    const events = await db.collection('events')
      .find({ date: { $gte: start, $lt: end }, name: { $exists: true } })
      .sort({ date: 1 })
      .toArray();

    // Build one row per feast (dedupe multi-day feasts by normalized tag)
    const feastMap = new Map(); // tag -> { date, raw }
    for (const ev of events) {
      const picked = pickHolyTextFromEvent(ev);
      if (!picked) continue;
      if (picked.type === 'sabbath') continue; // Sabbath is injected once below

      const key = picked.tag;
      if (!feastMap.has(key) || new Date(ev.date) < new Date(feastMap.get(key).date)) {
        feastMap.set(key, { date: ev.date, raw: picked.raw });
      }
    }

    const result = [];
    // Feasts
    for (const [tag, { date, raw }] of feastMap.entries()) {
  let explanation =
    await findHolyDayByName(tag) ||
    await findHolyDayByName(raw);

  // Fallbacks specifically for Tabernacles end
  if (!explanation && /tabernacles/.test(tag) && /end/i.test(raw)) {
    explanation =
      await findHolyDayByName('the eighth day') ||
      await findHolyDayByName('last great day') ||
      await findHolyDayByName('shemini atzeret');
  }

  result.push({
    date,
    date_utc: new Date(date).toISOString().slice(0, 10),
    name: raw,
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


    // Inject Sabbath once per month (first item)
    const sab = await findHolyDayByName('Sabbath');
    if (sab) result.unshift({ date: null, date_utc: null, name: 'Sabbath', explanation: sab });

    // Sort by date ascending, with Sabbath (null) first already
    result.sort((a, b) => (a.date ? new Date(a.date) : 0) - (b.date ? new Date(b.date) : 0));

    res.json(result);
  } catch (err) {
    console.error('Error fetching explanations:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
