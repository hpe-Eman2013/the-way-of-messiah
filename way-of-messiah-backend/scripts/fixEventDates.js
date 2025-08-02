// backend/scripts/fixEventDates.js

const mongoose = require("mongoose");
const Event = require("../models/Event");

async function fixDates() {
  try {
    await mongoose.connect("mongodb+srv://Yahman67:ma2bN0HvRZKwjniV@cluster0.umww5ge.mongodb.net/wayofmessiah?retryWrites=true&w=majority");

    const events = await Event.find({});

    for (const event of events) {
      if (typeof event.date === "string") {
        event.date = new Date(event.date);
        await event.save();
        console.log(`✅ Updated: ${event.name} → ${event.date}`);
      }
    }

    console.log("🎉 Date fix complete.");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

fixDates();
