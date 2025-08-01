require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Event = require("./models/Event"); // adjust if path differs

const MONGO_URI = process.env.MONGODB_URI;

async function seedEvents() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected.");

    const filePath = path.join(__dirname, "events-data", "2025_enoch_calendar_events.json");
    const rawData = fs.readFileSync(filePath);
    const events = JSON.parse(rawData);

    await Event.deleteMany(); // Clear previous entries
    await Event.insertMany(events);
    console.log(`${events.length} events inserted successfully.`);

    mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding events:", err);
    process.exit(1);
  }
}

seedEvents();
