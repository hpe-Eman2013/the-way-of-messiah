// backend/utils/equinox.js
const Astronomy = require('astronomy-engine'); // v2+
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(tz);

// Pick the timezone you want the calendar to follow, e.g., America/New_York
const DEFAULT_TZ = process.env.CALENDAR_TZ || 'America/New_York';

/**
 * Returns a JS Date for the March (spring) equinox in UTC for the given year.
 */
function getMarchEquinoxUTC(year) {
  const s = Astronomy.Seasons(year);
  // s.mar_equinox is an Astronomy.Time; use .date to get a JS Date in UTC
  return s.mar_equinox.date;
}

/**
 * Given a year and optional timezone, returns Day 1 (the day *after*
 * the equinox) as a JS Date at local midnight, stored in UTC.
 */
function getDayOneUtc(year, timeZone = DEFAULT_TZ) {
  const eqUtc = getMarchEquinoxUTC(year);               // JS Date (UTC)
  // move into local TZ, add 1 day, start of that day, then store as UTC
  const localDay1 = dayjs(eqUtc).tz(timeZone).add(1, 'day').startOf('day');
  return localDay1.utc().toDate();
}

module.exports = { getMarchEquinoxUTC, getDayOneUtc, DEFAULT_TZ };
