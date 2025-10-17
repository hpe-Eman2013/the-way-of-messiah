import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import axios from "axios";
import { fetchEventsForMonth } from "../lib/calendarApi.js";
import ExplanationPanel from "../components/ExplanationPanel.jsx";

dayjs.extend(utc);

// ------ Helpers (module scope)
const keyFromEvent = (e) => e?.dateYmd ?? e?.dateISO?.slice(0, 10) ?? null; // YYYY-MM-DD
const parseDayNumber = (title) => {
  const m = String(title || "").match(/^\s*day\s*(\d{1,3})\s*$/i);
  return m ? parseInt(m[1], 10) : null;
};

const groupByDay = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.reduce((acc, ev) => {
    const k = keyFromEvent(ev);
    if (!k) return acc;
    (acc[k] ||= []).push(ev);
    return acc;
  }, {});
};
// Color cell detectors helpers
const isSabbathTitle = (t) =>
  String(t || "")
    .toLowerCase()
    .includes("sabbath");
const isFeastTitle = (t) => {
  const s = String(t || "").toLowerCase();
  return [
    "passover",
    "unleavened",
    "first fruits",
    "weeks",
    "pentecost",
    "trumpets",
    "atonement",
    "tabernacles",
    "booths",
    "last great day",
  ].some((k) => s.includes(k));
};

export default function CalendarView() {
  // ---- URL query params (optional: year & month)
  const params = new URLSearchParams(window.location.search);
  const qsYear = params.get("year");
  const qsMonth = params.get("month"); // 1..12 expected

  // ---- Initial month in UTC
  const initialMonth =
    qsYear && qsMonth
      ? dayjs.utc(`${qsYear}-${String(qsMonth).padStart(2, "0")}-01`)
      : dayjs.utc().startOf("month");

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [events, setEvents] = useState([]);
  const [springEquinox, setSpringEquinox] = useState(null); // string or dayjs? we'll store string

  // ---- Build a quick lookup by day
  const byDay = useMemo(() => groupByDay(events), [events]);

  // ---- Fetch month events + equinox (404 safe)
  useEffect(() => {
    let cancel = false;

    const load = async () => {
      try {
        // Events for this month (UTC boundaries handled in helper)
        const data = await fetchEventsForMonth(
          selectedMonth.year(),
          selectedMonth.month()
        );
        if (!cancel) setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error fetching events:", e);
        if (!cancel) setEvents([]);
      }

      // Equinox is optional; treat 404 as no-data (don't error)
      try {
        const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        const url = `${BASE}/api/equinox?year=${selectedMonth.year()}`;
        const res = await axios.get(url);
        const ymd = res?.data?.equinoxYmd ?? res?.data?.springEquinox ?? null;
        if (!cancel) setSpringEquinox(ymd);
      } catch (err) {
        if (err?.response?.status === 404) {
          if (!cancel) setSpringEquinox(null);
        } else {
          console.warn("Equinox load (ignored):", err?.message || err);
          if (!cancel) setSpringEquinox(null);
        }
      }
    };

    load();
    return () => {
      cancel = true;
    };
  }, [selectedMonth]);

  // ---- Determine a single Day 1 anchor from available data
  const getEnochAnchor = () => {
    const list = Array.isArray(events) ? events : [];

    // Prefer explicit "Day 1"
    const d1 = list.find((e) => parseDayNumber(e.title) === 1);
    if (d1) return dayjs.utc(keyFromEvent(d1));

    // Else derive from any Day N (use the earliest by date for stability)
    const anyDay = list
      .map((e) => {
        const num = parseDayNumber(e.title);
        const ymd = keyFromEvent(e);
        return num && ymd ? { num, ymd } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.ymd.localeCompare(b.ymd))[0];

    if (anyDay) {
      return dayjs.utc(anyDay.ymd).subtract(anyDay.num - 1, "day");
    }

    // Last resort: equinox + 1 day (if API provided it)
    if (springEquinox) return dayjs.utc(springEquinox).add(1, "day");

    return null;
  };

  const enochAnchor = useMemo(() => getEnochAnchor(), [events, springEquinox]);

  // ---- Helpers used inside render
  const getEventsByDate = (dateUtc) => {
    const key = dateUtc?.format("YYYY-MM-DD");
    if (!key) return [];
    const bucket = byDay[key];
    return Array.isArray(bucket) ? bucket : [];
  };

  const calculateEnochDay = (dateUtc) => {
    if (!enochAnchor || dateUtc.isBefore(enochAnchor)) return null;
    const n = dateUtc.diff(enochAnchor, "day") + 1;
    return n >= 1 && n <= 364 ? n : null;
  };

  // ---- Navigation handlers
  const goPrevMonth = () => setSelectedMonth((m) => m.subtract(1, "month"));
  const goNextMonth = () => setSelectedMonth((m) => m.add(1, "month"));
  const goToday = () => setSelectedMonth(dayjs.utc().startOf("month"));

  // ---- Render month grid (42 cells)
  const renderCells = () => {
    const cells = [];

    const startOfMonthUtc = selectedMonth.utc().startOf("month");
    const firstGridDayUtc = startOfMonthUtc.startOf("week"); // Sunday-start grid in UTC

    for (let i = 0; i < 42; i++) {
      const currentDateUTC = firstGridDayUtc.add(i, "day");
      const currentDateLocal = currentDateUTC; // keep UTC label; or use .local() if you prefer local display

      const isCurrentMonth = currentDateUTC.month() === selectedMonth.month();

      const todayEvents = isCurrentMonth ? getEventsByDate(currentDateUTC) : [];
      const enochDay = calculateEnochDay(currentDateUTC);

      // Hide raw "Day N" events (we display the computed label instead)
      const displayEvents = todayEvents.filter(
        (e) => !/^day\s*\d{1,3}$/i.test(e?.title || "")
      );
      // flags
      const outsideMonth = !isCurrentMonth;
      const hasSabbathEvent = todayEvents.some((e) => isSabbathTitle(e.title));
      const hasFeastEvent = todayEvents.some((e) => isFeastTitle(e.title));
      // OR: if you prefer Enoch-week Sabbaths: const hasSabbathEvent = [7,14,21,28].includes(enochDay);

      // classes
      const base =
        "calendar-cell border p-2 min-h-[90px] flex flex-col bg-white";
      const sabbathCls = hasSabbathEvent
        ? " ring-2 ring-purple-500 bg-purple-50"
        : "";
      const feastCls = hasFeastEvent
        ? " ring-2 ring-emerald-500 bg-emerald-50"
        : "";
      const outCls = outsideMonth ? " opacity-40" : "";
      const cellClass = base + sabbathCls + feastCls + outCls;

      const key = currentDateUTC.format("YYYY-MM-DD");

      cells.push(
        <div key={key} className={cellClass}>
          <div className="text-xs font-semibold">
            {currentDateLocal.format("MMM D")}
          </div>
          {enochDay ? (
            <div className="text-xs mt-1 font-semibold">Day {enochDay}</div>
          ) : null}

          {displayEvents.map((event, idx) => {
            const label =
              Array.isArray(event.description) && event.description.length
                ? event.description.join(", ")
                : event.title || "";
            return (
              <div key={event.id ?? event._id ?? idx} className="text-xs mt-1">
                <strong>{label}</strong>
              </div>
            );
          })}
        </div>
      );
    }

    return cells;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={goPrevMonth}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
        >
          ← Prev
        </button>
        <button
          onClick={goToday}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
        >
          Today
        </button>
        <button
          onClick={goNextMonth}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
        >
          Next →
        </button>
        <div className="ml-3 text-sm text-gray-600">
          {selectedMonth.format("YYYY-MM")}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-300">{renderCells()}</div>

      {/* Optional panel (now 404-safe) */}
      <ExplanationPanel
        year={selectedMonth.year()}
        month={selectedMonth.month() + 1}
      />
    </div>
  );
}
