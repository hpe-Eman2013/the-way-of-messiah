// backend/services/calendarService.js

/**
 * Enoch Calendar Service
 * - 12 months with lengths: 30,30,31, 30,30,31, 30,30,31, 30,30,31 (364 total)
 * - Season markers are the 31st days in months 3, 6, 9, 12
 * - Sabbaths occur every 7th day counting from Day 1 (the day after the spring equinox)
 */

// ────────────────────────────────────────────────────────────────────────────────
// Dependencies used by getEventsFromDB
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

// Your Mongoose Event model (adjust path if needed)
const Event = require("../models/Event");

// ────────────────────────────────────────────────────────────────────────────────
// Constants and core calendar helpers
const MONTH_LENGTHS = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
const INTERCALARY_MONTHS = new Set([3, 6, 9, 12]); // months with day 31

/** Return a new Date object (UTC) with time zeroed. */
function toUtcDate(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Utility: clone and add days (UTC). */
function addDaysUTC(date, days) {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Day 1 is the day AFTER the spring equinox.
 * Pass the equinox date (UTC or local — this normalizes to UTC at midnight).
 */
function getDay1FromEquinox(equinoxDate) {
  const eq = toUtcDate(equinoxDate);
  return addDaysUTC(eq, 1);
}

/**
 * Build the 364-day Enoch year starting from day1Date (UTC-normalized).
 * Returns an array of months; each month has days with metadata.
 */
function buildEnochYear(day1Date) {
  const start = toUtcDate(day1Date);
  const months = [];
  let cursor = new Date(start); // UTC midnight

  // dayIndex starts at 1 for Day 1
  let dayIndex = 1;

  for (let m = 1; m <= 12; m++) {
    const len = MONTH_LENGTHS[m - 1];
    const days = [];

    for (let d = 1; d <= len; d++) {
      const date = new Date(cursor); // current day (UTC)
      const isSeasonMarker = INTERCALARY_MONTHS.has(m) && d === 31;
      const isSabbath = dayIndex % 7 === 0;

      days.push({
        date, // JS Date (UTC midnight)
        enochMonth: m, // 1..12
        enochDay: d, // 1..30 or 31
        enochQuarter: Math.ceil(m / 3), // 1..4
        isIntercalaryMonth: INTERCALARY_MONTHS.has(m),
        isSeasonMarker, // true on month 3/6/9/12 day 31
        isSabbath, // true every 7th day from Day 1
        enochDayIndex: dayIndex, // 1..364
      });

      // advance
      cursor = addDaysUTC(cursor, 1);
      dayIndex++;
    }

    months.push({
      month: m,
      length: len,
      intercalary: INTERCALARY_MONTHS.has(m),
      days,
    });
  }

  return months;
}

/**
 * Generate simple Mongo-ready event docs for:
 * - Day 1
 * - Each weekly Sabbath
 * - Quarter Season Markers (end of months 3, 6, 9, 12)
 * Fields align with your existing schema:
 *   { date, name, description, location, time, link }
 * All generated docs include description starting with "AUTO: Enoch generator" for safe overwrite.
 */
function generateEventDocs(enochMonths) {
  const docs = [];

  // Day 1
  const day1 = enochMonths[0].days[0];
  docs.push({
    date: day1.date,
    name: "Day 1",
    description: "AUTO: Enoch generator – First day of the year (day after spring equinox).",
    location: "",
    time: "",
    link: "",
  });

  for (const month of enochMonths) {
    for (const d of month.days) {
      // Sabbaths
      if (d.isSabbath) {
        docs.push({
          date: d.date,
          name: "Sabbath",
          description: "AUTO: Enoch generator – Weekly Sabbath.",
          location: "",
          time: "",
          link: "",
        });
      }

      // Season markers (quarter endings)
      if (d.isSeasonMarker) {
        docs.push({
          date: d.date,
          name: `Season Marker – End of Quarter ${d.enochQuarter}`,
          description: "AUTO: Enoch generator – Intercalary day (month 3/6/9/12, day 31).",
          location: "",
          time: "",
          link: "",
        });
      }
    }
  }

  return docs;
}

/**
 * Optional helper: write generated docs into MongoDB via a Mongoose model.
 * Safe "overwrite" mode removes only prior AUTO-generated docs for that date range.
 */
async function syncEnochYearToMongo({ year, equinoxDate, EventModel, overwrite = true }) {
  if (!EventModel) {
    throw new Error("syncEnochYearToMongo requires EventModel (Mongoose model).");
  }

  // Build year
  const day1 = getDay1FromEquinox(equinoxDate);
  const months = buildEnochYear(day1);
  const docs = generateEventDocs(months);

  // Derive a conservative date range (from Day 1 inclusive to Day 1 + 370 days)
  const rangeStart = toUtcDate(day1);
  const rangeEnd = addDaysUTC(day1, 370);

  let deletedCount = 0;

  if (overwrite) {
    const delRes = await EventModel.deleteMany({
      date: { $gte: rangeStart, $lt: rangeEnd },
      description: { $regex: "^AUTO: Enoch generator" },
    });
    deletedCount = delRes.deletedCount || 0;
  }

  if (docs.length) {
    await EventModel.insertMany(docs, { ordered: false });
  }

  return { insertedCount: docs.length, deletedCount };
}

// ────────────────────────────────────────────────────────────────────────────────
// getEventsFromDB — moved here from models/CalendarService.js
// NOTE: This is used by routes that build the ZIP label and pull events in range.
async function getEventsFromDB() {
  const now = dayjs();
  // If current month is March (2) or later, use the current year; otherwise, previous year
  const year = now.month() >= 2 ? now.year() : now.year() - 1; // March is 2 (0-indexed)

  // Day 1 (Enoch start) — your current implementation treats Mar 21 as Day 1
  const enochStart = dayjs(`${year}-03-21`).startOf("day");
  const enochEnd = enochStart.add(364, "day").endOf("day");

  const events = await Event.find({
    date: {
      $gte: enochStart.toDate(),
      $lte: enochEnd.toDate(),
    },
  })
    .sort({ date: 1 })
    .lean();

  return { events, enochStart: enochStart.toDate(), enochEnd: enochEnd.toDate() };
}

module.exports = {
  MONTH_LENGTHS,
  INTERCALARY_MONTHS,
  getDay1FromEquinox,
  buildEnochYear,
  generateEventDocs,
  syncEnochYearToMongo,
  getEventsFromDB,
};
