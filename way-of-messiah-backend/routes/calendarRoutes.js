// backend/routes/calendarRoutes.js

const express = require("express");
const router = express.Router();
const { getEventsFromDB } = require("../models/CalendarService");
const generateCalendarZIP = require("../utils/generateCalendarZIP");

router.get("/download", async (req, res) => {
  try {
    const { events, enochStart, enochEnd } = await getEventsFromDB();

    const zipBuffer = await generateCalendarZIP(events, enochStart); // optionally pass args if needed

    const filename = `EnochCalendar_${enochStart.format("YYYY-MM")}_to_${enochEnd.format("YYYY-MM")}.zip`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/zip");
    res.send(zipBuffer);
  } catch (err) {
    console.error("Failed to generate calendar ZIP:", err);
    res.status(500).send("Failed to generate calendar ZIP");
  }
});

module.exports = router;
