// backend/routes/calendarRoutes.js

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs/promises");
// ⬇️ UPDATED: pull from services now
const {
  getEventsFromDB,
  syncEnochFeastsToMongo,
} = require("../services/calendarService");
// ⬇️ Add your Mongoose model
const Event = require("../models/Event");
const generateCalendarZIP = require("../utils/generateCalendarZIP");
// TEMP sanity route
router.get("/ping", (req, res) => res.json({ ok: true, where: "calendarRoutes" }));
// GET /api/equinox?year=2025
// Returns the Spring Equinox as YYYY-MM-DD (derived as the day before Day 1).
router.get("/equinox", async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (!year) return res.status(400).json({ error: "year is required" });

    // derive Day 1 in Mar/Apr window, then equinox = day1 - 1 day
    const from = new Date(Date.UTC(year, 2, 1)); // Mar 1
    const to = new Date(Date.UTC(year, 3, 10)); // Apr 10
    const day1 = await Event.findOne({
      isPublished: true,
      title: "Day 1",
      date: { $gte: from, $lt: to },
    })
      .sort({ date: 1 })
      .lean();

    let day1Date = day1?.date;
    if (!day1Date) {
      const first = await Event.findOne({
        isPublished: true,
        date: { $gte: from, $lt: to },
      })
        .sort({ date: 1 })
        .lean();
      day1Date = first?.date;
    }
    if (!day1Date)
      return res.status(404).json({ error: "Day 1 not found for year" });

    const equinox = new Date(
      new Date(day1Date).getTime() - 24 * 60 * 60 * 1000
    );
    return res.json({ year, equinoxYmd: equinox.toISOString().slice(0, 10) });
  } catch (err) {
    console.error("GET /equinox failed:", err);
    return res.status(500).json({ error: "Failed to compute equinox" });
  }
});
// GET /api/explanations?year=2025&month=10
router.get("/explanations", async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);
    if (!year || !month)
      return res.status(400).json({ error: "year and month are required" });
    // stub payload — fill in later
    return res.json({ year, month, items: [] });
  } catch (err) {
    console.error("GET /explanations failed:", err);
    return res.status(500).json({ error: "Failed to load explanations" });
  }
});

router.get("/download", async (req, res) => {
  try {
    const { events, enochStart, enochEnd } = await getEventsFromDB();
    const { filename: zipFilename, buffer: zipBuffer } =
      await generateCalendarZIP(events, enochStart);

    const tmpPath = path.join(__dirname, "..", "tmp", zipFilename);
    // Ensure the tmp folder exists
    await fs.mkdir(path.dirname(tmpPath), { recursive: true });

    await fs.writeFile(tmpPath, zipBuffer);
    // Dynamic filename
    const formatDate = (date) => {
      const d = new Date(date); // ← this line ensures it's a Date object
      const month = d.toLocaleString("en-US", { month: "short" });
      const year = d.getFullYear();
      return `${month}${year}`;
    };
    const filenameLabel = `Consecrated_Calendar_${formatDate(
      enochStart
    )}_to_${formatDate(enochEnd)}.zip`;
    res.download(tmpPath, filenameLabel, (err) => {
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
// Get all events
router.get("/events", async (req, res) => {
  try {
    const { from, to } = req.query;
    const col = req.app.locals.db.collection("events");
    const match = { isPublished: true };
    if (from || to) {
      const gte = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
      const lt = to ? new Date(`${to}T00:00:00.000Z`) : undefined;
      match.$or = [
        { date: { ...(gte ? { $gte: gte } : {}), ...(lt ? { $lt: lt } : {}) } },
        {
          startDate: {
            ...(gte ? { $gte: gte } : {}),
            ...(lt ? { $lt: lt } : {}),
          },
        },
      ];
    }

    const docs = await Event.aggregate([
      { $match: match },
      { $addFields: { sortKey: { $ifNull: ["$date", "$startDate"] } } },
      { $sort: { sortKey: 1, title: 1, _id: 1 } },
      {
        $project: {
          id: { $toString: "$_id" },
          title: 1,
          category: 1,

          // ✅ description normalized to array of strings
          description: {
            $let: {
              vars: { d: "$description" },
              in: {
                $cond: [
                  { $isArray: "$$d" },
                  { $map: { input: "$$d", as: "x", in: { $toString: "$$x" } } },
                  {
                    $cond: [
                      {
                        $gt: [
                          {
                            $strLenCP: { $ifNull: [{ $toString: "$$d" }, ""] },
                          },
                          0,
                        ],
                      },
                      [{ $toString: "$$d" }],
                      [],
                    ],
                  },
                ],
              },
            },
          },

          location: { $ifNull: ["$location", ""] },
          link: { $ifNull: ["$link", ""] },
          time: { $ifNull: ["$time", ""] },

          // All-day
          dateISO: {
            $cond: [
              { $eq: [{ $type: "$date" }, "date"] },
              {
                $dateToString: {
                  date: "$date",
                  format: "%Y-%m-%dT%H:%M:%S.%LZ",
                  timezone: "UTC",
                },
              },
              null,
            ],
          },
          dateYmd: {
            $cond: [
              { $eq: [{ $type: "$date" }, "date"] },
              {
                $dateToString: {
                  date: "$date",
                  format: "%Y-%m-%d",
                  timezone: "UTC",
                },
              },
              null,
            ],
          },

          // Timed (emit only if present)
          startDateISO: {
            $cond: [
              { $eq: [{ $type: "$startDate" }, "date"] },
              {
                $dateToString: {
                  date: "$startDate",
                  format: "%Y-%m-%dT%H:%M:%S.%LZ",
                  timezone: "UTC",
                },
              },
              "$$REMOVE",
            ],
          },
          endDateISO: {
            $cond: [
              { $eq: [{ $type: "$endDate" }, "date"] },
              {
                $dateToString: {
                  date: "$endDate",
                  format: "%Y-%m-%dT%H:%M:%S.%LZ",
                  timezone: "UTC",
                },
              },
              "$$REMOVE",
            ],
          },
          timezone: { $ifNull: ["$timezone", "$$REMOVE"] },

          sortKey: 0,
        },
      },
    ]);

    res.json(docs);
  } catch (err) {
    console.error("GET /events failed:", err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

// POST /api/calendar/enoch/:year/feasts
router.post("/enoch/:year/feasts", async (req, res, next) => {
  try {
    const year = Number(req.params.year);
    const {
      equinoxISO,
      overwrite = true,
      sukkotAllDays = false,
    } = req.body || {};

    if (!equinoxISO) {
      return res
        .status(400)
        .json({ error: "equinoxISO (ISO date string) is required" });
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
