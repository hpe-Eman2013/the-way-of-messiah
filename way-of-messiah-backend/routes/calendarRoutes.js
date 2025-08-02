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
    await fs.writeFile(tmpPath, zipBuffer);

    res.download(tmpPath, zipFilename, async err => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).send("Failed to download calendar ZIP.");
      } else {
        try {
          await fs.unlink(tmpPath); // Clean up
        } catch (unlinkErr) {
          console.warn("Failed to delete temp file:", unlinkErr.message);
        }
      }
    });
  } catch (err) {
    console.error("Failed to generate calendar ZIP:", err);
    res.status(500).send("Failed to generate calendar ZIP");
  }
});

module.exports = router;
