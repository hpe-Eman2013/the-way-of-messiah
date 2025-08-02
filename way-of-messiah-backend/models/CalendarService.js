// backend/models/CalendarService.js

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const Event = require("./Event");

async function getEventsFromDB() {
  const now = dayjs();
  const year = now.month() >= 2 ? now.year() : now.year() - 1; // March is month 2 (0-indexed)
  const enochStart = dayjs(`${year}-03-21`).startOf("day");
  const enochEnd = enochStart.add(364, "day").endOf("day");

  const events = await Event.find({
    date: {
      $gte: enochStart.toDate(),
      $lte: enochEnd.toDate(),
    }
  }).sort({ date: 1 }).lean();

  return { events, enochStart, enochEnd };
}

module.exports = {
  getEventsFromDB,
};
