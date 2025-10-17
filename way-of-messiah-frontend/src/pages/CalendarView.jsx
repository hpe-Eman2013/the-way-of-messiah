import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import axios from "axios";
import { fetchEventsForMonth } from "../lib/calendarApi";
import ExplanationPanel from "../components/ExplanationPanel.jsx";

dayjs.extend(utc);

/* ----------------- Helpers ----------------- */

// Accept title from either `title` or `name`
const getTitle = (e) => (e?.title ?? e?.name ?? "");

// Parse "Day N" from titles like "Day 1", "day 12", etc.
const parseDayNumber = (t) => {
  const m = String(t || "").match(/^\s*day\s*(\d{1,3})\s*$/i);
  return m ? parseInt(m[1], 10) : null;
};

// Convert any supported date-ish field to YYYY-MM-DD
const toYmd = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v.slice(0, 10);
  try { return dayjs.utc(v).format("YYYY-MM-DD"); } catch { return null; }
};

// Normalize events so we can rely on `id`, `title`, and `dateYmd`
const normalizeEvent = (e) => {
  const id = (e?.id ?? e?._id ?? "").toString();
  const title = e?.title ?? e?.name ?? "";
  const dateYmd =
    e?.dateYmd ??
    toYmd(e?.dateISO) ??
    toYmd(e?.date) ??
    toYmd(e?.startDate) ??
    null;
  return { ...e, id, title, dateYmd };
};

// Get the day key we use for lookup
const keyFromEvent = (e) =>
  e?.dateYmd ??
  toYmd(e?.dateISO) ??
  toYmd(e?.date) ??
  toYmd(e?.startDate) ??
  null;

// Build a map: YYYY-MM-DD -> [events]
const groupByDay = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.reduce((acc, ev) => {
    const k = keyFromEvent(ev);
    if (!k) return acc;
    (acc[k] ||= []).push(ev);
    return acc;
  }, {});
};

export default function CalendarView() {
  // ---- Optional ?year=YYYY&month=M in URL
  const params = new URLSearchParams(window.location.search);
  const qsYear = params.get("year");
  const qsMonth = params.get("month"); // 1..12

  // ---- Initial month (UTC)
  const initialMonth =
    qsYear && qsMonth
      ? dayjs.utc(`${qsYear}-${String(qsMonth).padStart(2, "0")}-01`)
      : dayjs.utc().startOf("month");

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [events, setEvents] = useState([]);
  const [springEquinox, setSpringEquinox] = useState(null); // 'YYYY-MM-DD' or null
  const [yearAnchor, setYearAnchor] = useState(null); // dayjs or null

  const byDay = useMemo(() => groupByDay(events), [events]);

  /* -------- Month events + (optional) equinox fetch -------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const raw = await fetchEventsForMonth(
          selectedMonth.year(),
          selectedMonth.month()
        );

        // Accept array, { items: [...] }, or { events: [...] }
        const arr = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.events)
          ? raw.events
          : [];

        if (!cancel) setEvents(arr.map(normalizeEvent));
      } catch (e) {
        console.error("Error fetching events:", e);
        if (!cancel) setEvents([]);
      }

      // Equinox is optional; treat 404 as no data
      try {
        const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        const res = await axios.get(
          `${BASE}/api/equinox?year=${selectedMonth.year()}`
        );
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
    })();
    return () => {
      cancel = true;
    };
  }, [selectedMonth]);

  /* -------- Year anchor fetch (Mar 1 → Apr 10) --------
     We load a tiny spring window once per year so Day labels work in every month. */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const year = selectedMonth.year();
        const from = dayjs.utc(`${year}-03-01`).format("YYYY-MM-DD");
        const to = dayjs.utc(`${year}-04-10`).format("YYYY-MM-DD");

        const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        const r = await fetch(`${BASE}/api/events?from=${from}&to=${to}`);
        if (!r.ok) throw new Error(`anchor HTTP ${r.status}`);
        const raw = await r.json();
        const arr = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.events)
          ? raw.events
          : [];
        const list = arr.map(normalizeEvent);

        // Prefer explicit Day 1
        const d1 = list.find((e) => e.dateYmd && parseDayNumber(e.title) === 1);
        if (!cancel && d1) {
          setYearAnchor(dayjs.utc(d1.dateYmd));
          return;
        }

        // Else derive from any Day N (earliest by date)
        const any = list
          .filter((e) => e.dateYmd && parseDayNumber(e.title))
          .sort((a, b) => a.dateYmd.localeCompare(b.dateYmd))[0];
        if (!cancel && any) {
          const n = parseDayNumber(any.title);
          setYearAnchor(dayjs.utc(any.dateYmd).subtract(n - 1, "day"));
          return;
        }

        // Fallback: equinox + 1 day (if available)
        if (!cancel)
          setYearAnchor(
            springEquinox ? dayjs.utc(springEquinox).add(1, "day") : null
          );
      } catch {
        if (!cancel)
          setYearAnchor(
            springEquinox ? dayjs.utc(springEquinox).add(1, "day") : null
          );
      }
    })();
    return () => {
      cancel = true;
    };
  }, [selectedMonth.year(), springEquinox]);

  /* -------- Month-scope anchor (from current month events) -------- */
  const enochAnchor = useMemo(() => {
    const list = Array.isArray(events) ? events : [];

    const d1 = list.find(
      (e) => parseDayNumber(getTitle(e)) === 1 && keyFromEvent(e)
    );
    if (d1) return dayjs.utc(keyFromEvent(d1));

    const anyDay = list
      .map((e) => {
        const num = parseDayNumber(getTitle(e));
        const ymd = keyFromEvent(e);
        return num && ymd ? { num, ymd } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.ymd.localeCompare(b.ymd))[0];

    if (anyDay) return dayjs.utc(anyDay.ymd).subtract(anyDay.num - 1, "day");

    return springEquinox ? dayjs.utc(springEquinox).add(1, "day") : null;
  }, [events, springEquinox]);

  /* -------- Lookups & labeling -------- */
  const getEventsByDate = (dateUtc) => {
    const key = dateUtc?.format("YYYY-MM-DD");
    if (!key) return [];
    const bucket = byDay[key];
    return Array.isArray(bucket) ? bucket : [];
  };

  // Use the best anchor available: month → year → equinox+1
  const calculateEnochDay = (dateUtc) => {
    const anchor =
      enochAnchor ||
      yearAnchor ||
      (springEquinox ? dayjs.utc(springEquinox).add(1, "day") : null);
    if (!anchor || dateUtc.isBefore(anchor)) return null;
    const n = dateUtc.diff(anchor, "day") + 1;
    return n >= 1 && n <= 364 ? n : null;
  };

  /* -------- Navigation -------- */
  const goPrevMonth = () => setSelectedMonth((m) => m.subtract(1, "month"));
  const goNextMonth = () => setSelectedMonth((m) => m.add(1, "month"));
  const goToday = () => setSelectedMonth(dayjs.utc().startOf("month"));

  /* -------- Grid render (42 cells) -------- */
  const renderCells = () => {
    const cells = [];
    const startOfMonthUtc = selectedMonth.utc().startOf("month");
    const firstGridDayUtc = startOfMonthUtc.startOf("week"); // Sunday-start in UTC

    for (let i = 0; i < 42; i++) {
      const currentDateUTC = firstGridDayUtc.add(i, "day");
      const currentDateLabel = currentDateUTC; // use .local() if you prefer local labels
      const isCurrentMonth = currentDateUTC.month() === selectedMonth.month();

      const todayEvents = isCurrentMonth ? getEventsByDate(currentDateUTC) : [];
      const enochDay = calculateEnochDay(currentDateUTC);

      // Coloring by event titles (you can refine these)
      const hasSabbathEvent = todayEvents.some((e) =>
        /sabbath/i.test(getTitle(e))
      );
      const hasFeastEvent = todayEvents.some((e) =>
        /passover|unleavened|first\s*fruits|weeks|pentecost|trumpets|atonement|tabernacles|booths|last\s*great\s*day/i.test(
          getTitle(e)
        )
      );

      const base =
        "calendar-cell border p-2 min-h-[90px] flex flex-col bg-white";
      const sabbathCls = hasSabbathEvent
        ? " ring-2 ring-purple-500 bg-purple-50"
        : "";
      const feastCls = hasFeastEvent
        ? " ring-2 ring-emerald-600 bg-emerald-50"
        : "";
      const outsideCls = !isCurrentMonth ? " opacity-40" : "";
      const cellClass = `${base}${sabbathCls}${feastCls}${outsideCls}`;

      // Only hide raw “Day N” titles if we actually show the computed label
      const displayEvents = enochDay
        ? todayEvents.filter((e) => !/^\s*day\s*\d{1,3}\s*$/i.test(getTitle(e)))
        : todayEvents;

      const key = currentDateUTC.format("YYYY-MM-DD");
      cells.push(
        <div key={key} className={cellClass}>
          {/* Date label */}
          <div className="text-xs font-semibold">
            {currentDateLabel.format("MMM D")}
          </div>

          {/* Computed Enoch Day label */}
          {enochDay ? (
            <div className="text-xs mt-1 font-semibold">Day {enochDay}</div>
          ) : null}

          {/* Non-Day events */}
          {displayEvents.map((event, idx) => {
            const label =
              Array.isArray(event.description) && event.description.length
                ? event.description.join(", ")
                : getTitle(event);
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
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold">CONSECRATED DAYS OF YAHUAH</h1>
        <div className="text-sm text-gray-700">
          {selectedMonth.format("MMMM YYYY")} – Enoch 364 Day Calendar
        </div>
      </div>

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
      {/* DEBUG (remove later) */}
      <div className="text-xs text-gray-600">
        <div>
          events: {Array.isArray(events) ? events.length : 0} • days in map:{" "}
          {Object.keys(byDay || {}).length}
        </div>
        <div>
          anchor (year): {yearAnchor ? yearAnchor.format("YYYY-MM-DD") : "–"} •
          anchor (month): {enochAnchor ? enochAnchor.format("YYYY-MM-DD") : "–"}
        </div>
        <div>
          sample keys:{" "}
          {Object.keys(byDay || {})
            .sort()
            .slice(0, 5)
            .join(", ") || "none"}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-300">{renderCells()}</div>

      {/* Explanation panel (it hides itself on 404/empty by design) */}
      <ExplanationPanel
        year={selectedMonth.year()}
        month={selectedMonth.month() + 1}
      />
    </div>
  );
}
