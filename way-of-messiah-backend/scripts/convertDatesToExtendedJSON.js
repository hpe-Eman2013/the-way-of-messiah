const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "../events-data/2025_enoch_calendar_events_fixed.json");
const outputPath = path.join(__dirname, "../events-data/calendar-events-fixed.json");

try {
  const rawData = fs.readFileSync(inputPath, "utf-8");
  const events = JSON.parse(rawData);

  const fixedEvents = events.map(event => {
    const fixedEvent = { ...event };

    if (typeof event.date === "string") {
      const isoDate = new Date(event.date).toISOString();
      fixedEvent.date = { "$date": isoDate };
    }

    return fixedEvent;
  });

  // Manual JSON stringification to preserve $date objects
  const jsonString = JSON.stringify(fixedEvents, null, 2)
    .replace(/"\\u0024date"/g, '"$date');

  fs.writeFileSync(outputPath, jsonString);
  console.log(`✅ Converted and saved to: ${outputPath}`);
} catch (err) {
  console.error("❌ Failed to convert dates:", err);
}
