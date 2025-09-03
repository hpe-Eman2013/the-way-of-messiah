// backend/routes/calendarRoutes.js

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs/promises");
// ⬇️ UPDATED: pull from services now
const { getEventsFromDB, syncEnochFeastsToMongo } = require("../services/calendarService");
// ⬇️ Add your Mongoose model
const Event = require("../models/Event");
const generateCalendarZIP = require("../utils/generateCalendarZIP");

router.get("/download", async (req, res) => {
  try {
    const { events, enochStart, enochEnd } = await getEventsFromDB();
    const { filename: zipFilename, buffer: zipBuffer } = await generateCalendarZIP(events, enochStart);

    const tmpPath = path.join(__dirname, "..", "tmp", zipFilename);
    // Ensure the tmp folder exists
    await fs.mkdir(path.dirname(tmpPath), { recursive: true });

    await fs.writeFile(tmpPath, zipBuffer);
    // Dynamic filename
    const formatDate = date => {
      const d = new Date(date); // ← this line ensures it's a Date object
      const month = d.toLocaleString("en-US", { month: "short" });
      const year = d.getFullYear();
      return `${month}${year}`;
    };
    const filenameLabel = `Consecrated_Calendar_${formatDate(enochStart)}_to_${formatDate(enochEnd)}.zip`;
     res.download(tmpPath, filenameLabel, err => {
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
// POST /api/calendar/enoch/:year/feasts
router.post("/enoch/:year/feasts", async (req, res, next) => {
  try {
    const year = Number(req.params.year);
    const { equinoxISO, overwrite = true, sukkotAllDays = false } = req.body || {};

    if (!equinoxISO) {
      return res.status(400).json({ error: "equinoxISO (ISO date string) is required" });
    }

    const result = await syncEnochFeastsToMongo({
      equinoxDate: new Date(equinoxISO), // e.g., "2025-03-20T00:00:00.000Z"
      EventModel: Event,
      overwrite,
      sukkotAllDays,
    });

    res.json({ year, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
