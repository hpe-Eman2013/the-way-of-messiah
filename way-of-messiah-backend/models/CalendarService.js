const dayjs = require("dayjs");
const Event = require("./Event");

async function getEventsFromDB() {
  const now = dayjs();
  const year = now.month() >= 2 ? now.year() : now.year() - 1; // 2 = March (0-indexed)

  const springEquinox = dayjs(`${year}-03-20`);
  const dayOne = springEquinox.add(1, "day"); // March 21
  const dayEnd = dayOne.add(364, "day");

  return await Event.find({
    date: {
      $gte: dayOne.toDate(),
      $lte: dayEnd.toDate()
    }
  }).sort({ date: 1 }).lean();
}

module.exports = {
  getEventsFromDB,
};
