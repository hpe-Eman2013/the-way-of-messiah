// Usage: node scripts/seedEnochYear.js 2025 [America/New_York]
// If you pass CALENDAR_TZ in env, you can omit the second arg.
require("dotenv").config({
  path:
    process.env.NODE_ENV === "production"
      ? ".env.production"
      : ".env.development",
});

const mongoose = require("mongoose");
const dayjs = require("dayjs");
const { getDayOneUtc } = require("../utils/equinox");
const Event = require("../models/Event"); // adjust path if needed

async function run() {
  const [, , yearArg, tzArg] = process.argv;
  if (!yearArg) {
    console.error("Usage: node scripts/seedEnochYear.js <YEAR> [IANA_TZ]");
    process.exit(1);
  }
  const year = parseInt(yearArg, 10);
  const timeZone = tzArg || process.env.CALENDAR_TZ || "America/New_York";

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");

  await mongoose.connect(uri);

  const day1Utc = getDayOneUtc(year, timeZone); // JS Date (UTC midnight of local day 1)
  console.log(
    `Seeding year ${year}. Day 1 (local midnight in ${timeZone}) = ${dayjs(
      day1Utc
    )
      .utc()
      .format()}`
  );

  const ops = [];
  for (let i = 1; i <= 364; i++) {
    const start = dayjs(day1Utc)
      .add(i - 1, "day")
      .toDate();
    ops.push({
      updateOne: {
        filter: { year, dayNumber: i },
        update: {
          $setOnInsert: { category: "Calendar" },
          $set: {
            title: `Day ${i}`,
            year,
            dayNumber: i,
            startDate: start,
            isPublished: true,
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length) {
    await Event.bulkWrite(ops, { ordered: false });
  }
  console.log(`Seeded/Upserted ${ops.length} events for ${year}.`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
