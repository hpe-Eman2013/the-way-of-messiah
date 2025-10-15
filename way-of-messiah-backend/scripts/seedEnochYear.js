require("dotenv").config({ path: ".env.development" }); // or .env.production
const mongoose = require("mongoose");
const dayjs = require("dayjs");
const Event = require("../models/Event");

async function run() {
  const [ , , yearStr, equinoxStr ] = process.argv;
  if (!yearStr || !equinoxStr) {
    console.error("Usage: node scripts/seedEnochYear.js <YEAR> <EQUINOX_YYYY-MM-DD>");
    process.exit(1);
  }
  const year = parseInt(yearStr, 10);
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGODB_URI) throw new Error("MONGODB_URI missing");

  await mongoose.connect(MONGODB_URI);

  const equinox = dayjs(equinoxStr);
  const day1 = equinox.add(1, "day").startOf("day");

  for (let i = 1; i <= 364; i++) {
    const start = day1.add(i - 1, "day").toDate();
    const title = `Day ${i}`;
    await Event.updateOne(
      { year, dayNumber: i },
      {
        $setOnInsert: { category: "Calendar" },
        $set: {
          title,
          year,
          dayNumber: i,
          startDate: start,
          isPublished: true,
        },
      },
      { upsert: true }
    );
  }

  console.log(`Seeded/Upserted ${year} Enoch year from ${equinoxStr} (Day 1 = ${day1.format("YYYY-MM-DD")}).`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
