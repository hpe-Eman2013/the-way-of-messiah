// backend/routes/calendarRoutes.js

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs/promises");
const { getEventsFromDB } = require("../models/CalendarService");
const generateCalendarZIP = require("../utils/generateCalendarZIP");

router.get("/download", async (req, res) => {
  try {
    const { events, enochStart, enochEnd } = await getEventsFromDB();
    const { filename: zipFilename, buffer: zipBuffer } = await generateCalendarZIP(events, enochStart);

    const tmpPath = path.join(__dirname, "..", "tmp", zipFilename);
    // Ensure the tmp folder exists
    await fs.mkdir(path.dirname(tmpPath), { recursive: true });

    await fs.writeFile(tmpPath, zipBuffer);
    res.download(tmpPath, zipFilename, err => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).send("Failed to download calendar ZIP.");
      } else {
        fs.unlink(tmpPath); // clean up after download
      }
    });
  } catch (err) {
    console.error("Failed to generate calendar ZIP:", err);
    res.status(500).send("Failed to generate calendar ZIP");
  }
});

module.exports = router;
