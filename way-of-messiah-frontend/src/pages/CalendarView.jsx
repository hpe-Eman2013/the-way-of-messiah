import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import ExplanationPanel from "../components/ExplanationPanel.jsx";
import "../assets/css/CalendarView.css";

dayjs.extend(utc);

const CalendarView = () => {
  const [springEquinox, setSpringEquinox] = useState(null);
  const [events, setEvents] = useState([]);

  // --- Print mode & query params ---
  const params = new URLSearchParams(window.location.search);
  const printMode = params.get("print") === "1";
  const qsYear = Number(params.get("year"));
  const qsMonth = Number(params.get("month"));

  const initialMonth = qsYear && qsMonth
    ? dayjs(`${qsYear}-${String(qsMonth).padStart(2, "0")}-01`)
    : dayjs().startOf("month");

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [panelReady, setPanelReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  // Toggle this flag to enable/disable the Download button globally
  const DOWNLOAD_ENABLED = false;
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchEquinox = async () => {
      try {
        const year = selectedMonth.year();
        const res = await axios.get(`${BASE_URL}/api/equinox?year=${year}`);
        setSpringEquinox(dayjs.utc(res.data.springEquinox));
      } catch (err) {
        console.error("Error fetching spring equinox:", err);
        setSpringEquinox(null);
      }
    };

    const fetchEvents = async () => {
      try {
        const eventsRes = await axios.get(`${BASE_URL}/api/events`);
        setEvents(eventsRes.data || []);
      } catch (err) {
        console.error("Error fetching events:", err);
        setEvents([]);
      }
    };

    fetchEquinox();
    fetchEvents();
  }, [BASE_URL, selectedMonth]);

  // ---------- Helpers ----------
  // Treat feast detection broadly (supports synonyms & Hebrew names)
  const isFeast = (text) =>
    /(feast|passover|atonement|tabernacles|shavuot|unleavened|trumpets|firstfruits|teruah|kippur|sukkot|weeks)/i.test(
      text
    );

  // Normalize labels like "Feast of Tabernacles (Sukkot) Start" -> "feast of tabernacles"
  const normalizeFeastTag = (s) =>
    s
      ?.toString()
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s+(start|end)\s*$/i, "")
      .trim();

  // Compare using UTC to avoid TZ pushing items to the previous/next day
  const getEventsByDate = (dateLocal) => {
    const dateUTC = dayjs.utc(dateLocal.format("YYYY-MM-DD"));
    return events.filter((e) => dayjs.utc(e.date).isSame(dateUTC, "day"));
  };

  const isFeastEvent = (e) => {
    const check = (val) => typeof val === "string" && isFeast(val.toLowerCase());
    if (Array.isArray(e.description)) return e.description.some(check);
    return check(e.name) || check(e.description);
  };

  const isSabbathEvent = (e) => {
    const check = (val) =>
      typeof val === "string" && val.toLowerCase().includes("sabbath");
    if (Array.isArray(e.description)) return e.description.some(check);
    return check(e.description);
  };

  const renderCells = (month) => {
    const cells = [];
    const startDay = month.startOf("month").day(); // 0=Sun
    const daysInMonth = month.daysInMonth();
    const totalCells = startDay + daysInMonth > 35 ? 42 : 35;

    for (let i = 0; i < totalCells; i++) {
      const currentDateLocal = month.startOf("month").add(i - startDay, "day");
      const isCurrentMonth = currentDateLocal.month() === month.month();

      // Use UTC for logic; local only for labels
      const currentDateUTC = dayjs.utc(currentDateLocal.format("YYYY-MM-DD"));
      const todayEvents = isCurrentMonth ? getEventsByDate(currentDateLocal) : [];

      const calculateEnochDay = (dateUTC) => {
        const lastEnochDay = events.find((e) => e.name === "Day 364");
        const fallbackEquinox = (() => {
          const year = selectedMonth.year();
          const beforeMarch20 = dateUTC.isBefore(dayjs.utc(`${year}-03-20`));
          if (beforeMarch20 && lastEnochDay) {
            return dayjs.utc(lastEnochDay.date).add(1, "day");
          }
          return dayjs.utc(`${year - 1}-03-20`);
        })();

        const actualEquinox = springEquinox ? dayjs.utc(springEquinox) : fallbackEquinox;
        const firstCycleStart = actualEquinox.add(1, "day"); // Day 1 = day after equinox
        if (dateUTC.isBefore(firstCycleStart)) return null;

        const daysSinceFirst = dateUTC.diff(firstCycleStart, "day");
        const currentCycleStart =
          firstCycleStart.add(Math.floor(daysSinceFirst / 364) * 364, "day");
        const enochDay = dateUTC.diff(currentCycleStart, "day") + 1;
        return enochDay > 364 ? null : enochDay;
      };

      const enochDay = calculateEnochDay(currentDateUTC);

      const classNames = [];
      if (todayEvents.some((e) => isSabbathEvent(e))) classNames.push("sabbath");
      if (todayEvents.some((e) => isFeastEvent(e))) classNames.push("feast");

      cells.push(
        <div key={i} className={`day ${classNames.join(" ")}`}>
          {isCurrentMonth && (
            <>
              {/* Local for visual label */}
              <div className="font-bold text-sm">
                {currentDateLocal.format("MMM D")}
              </div>
              {enochDay && <div className="text-xs font-bold">Day {enochDay}</div>}
              {todayEvents.map((event) => {
                const isDayLabel = /^Day\s\d{1,3}$/i.test(event.name);
                return !isDayLabel ? (
                  <div key={event._id} className="text-xs mt-1">
                    <strong>
                      {Array.isArray(event.description) && event.description.length > 0
                        ? event.description.join(", ")
                        : event.name}
                    </strong>
                  </div>
                ) : null;
              })}
            </>
          )}
        </div>
      );
    }
    return cells;
  };

  // Paging controls
  const goToPreviousMonth = () => setSelectedMonth((prev) => prev.subtract(1, "month"));
  const goToNextMonth = () => setSelectedMonth((prev) => prev.add(1, "month"));

  // Download ZIP (start from current view)
  const handleDownloadCalendar = async () => {
    try {
      setDownloading(true);
      const y = selectedMonth.year();
      const m = selectedMonth.month() + 1;
      const response = await fetch(`${BASE_URL}/calendar/download?year=${y}&startMonth=${m}&months=12`);
      if (!response.ok) throw new Error("Failed to download calendar");
      const blob = await response.blob();

      let filename = "calendar.zip";
      const disposition = response.headers.get("Content-Disposition");
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/["']+/g, "");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Download failed. Please try again.");
      console.error("Error downloading calendar:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      id="print-ready"
      data-state={panelReady ? 'ready' : 'loading'}
      className={`min-h-screen bg-gray-100 text-black p-4 calendar-page ${printMode ? 'print' : ''}`}
    >
      <h1 className="calendar-view-title text-2xl font-bold">
        CONSECRATED DAYS OF YAHUAH
      </h1>
      <h2 className="calendar-view-title text-xl font-semibold mb-2">
        {selectedMonth.format("MMMM YYYY")} - Enoch 364 Day Calendar
      </h2>

      {!printMode && (
        <div className="flex justify-center items-center gap-3 mb-4 flex-wrap">
          <button
            onClick={goToPreviousMonth}
            className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 rounded"
          >
            ← Prev
          </button>
          <button
            onClick={goToNextMonth}
            className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 rounded"
          >
            Next →
          </button>
          <button
            onClick={DOWNLOAD_ENABLED ? handleDownloadCalendar : undefined}
            disabled={!DOWNLOAD_ENABLED || downloading}
            aria-disabled={!DOWNLOAD_ENABLED}
            title={DOWNLOAD_ENABLED ? "" : "Download coming soon"}
            className={`px-4 py-2 rounded flex items-center gap-2 text-white ${DOWNLOAD_ENABLED ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed opacity-60"}`}
          >
            {downloading ? (
              <span className="loader inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : null}
            {DOWNLOAD_ENABLED ? (downloading ? "Downloading..." : "Download Calendar (.zip)") : "Download (coming soon)"}
          </button>
        </div>
      )}

      {/* Day-of-week header */}
      <div className="calendar-header">
        {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Grid + Explanations wrapped so only the bottom panel scrolls */}
      <div className="calendar-content">
        <div className="calendar-grid">{renderCells(selectedMonth)}</div>
        {/* ✅ Explanations panel (signals when loaded) */}
        <ExplanationPanel
          year={selectedMonth.year()}
          month={selectedMonth.month() + 1}
          onLoaded={() => setPanelReady(true)}
        />
      </div>
    </div>
  );
};

export default CalendarView;
