import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import axios from "axios";
import { fetchEventsForMonth } from "../lib/calendarApi";
import ExplanationPanel from "../components/ExplanationPanel.jsx";
import { CAL_BASE, API_BASE } from "../lib/api.js";
import {
  normalizeEvent,
  groupByDay,
  isSabbath,
  isFeast,
  extractFeastLabels,
  computeExplanationItems,
  composeCellClass,
  getTitle,
  parseDayNumber,
} from "../lib/calendarHelpers.js";

dayjs.extend(utc);

// Weekday Helper
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
// Normalize events so we can rely on `id`, `title`, and `dateYmd`

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


  useEffect(() => {
    const k = "2025-04-03";
    console.log(`byDay[${k}]:`, byDay[k]);
    console.table(
      (byDay[k] || []).map((e) => ({
        title: e.title,
        desc: e.description?.join?.(", "),
        dateYmd: e.dateYmd,
      }))
    );
  }, [byDay]);

  useEffect(() => {
    console.table(
      (events || []).slice(0, 12).map((e) => ({
        dateYmd: e.dateYmd,
        title: e.title,
        description: e.description, // should be an array
        searchText: e.searchText, // lowercased joined text
      }))
    );
  }, [events]);
  // DEBUG: which month are we fetching?
  useEffect(() => {
    console.table(
      (events || []).slice(0, 15).map((e) => ({
        dateYmd: e.dateYmd,
        title: e.title,
        description: e.description, // should be an array
        searchText: e.searchText,
      }))
    );

    // Quick targeted check for Apr 3
    const hit = (events || []).find((e) => e.dateYmd === "2025-04-03");
    console.log("[CHECK] 2025-04-03 present?", !!hit, hit);
  }, [events]);

  /* -------- Month events + (optional) equinox fetch -------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const raw = await fetchEventsForMonth(
          selectedMonth.year(),
          selectedMonth.month()
        );
        const safe = (Array.isArray(raw) ? raw : []).map(normalizeEvent);
        if (!cancel) setEvents(safe);
      } catch (e) {
        console.error("Error fetching events:", e);
        if (!cancel) setEvents([]);
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

        const r = await fetch(`${CAL_BASE}/events?from=${from}&to=${to}`);
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

    const d1 = list.find((e) => parseDayNumber(e) === 1 && e.dateYmd);
    if (d1) return dayjs.utc(d1.dateYmd);

    const any = list
      .map((e) => {
        const n = parseDayNumber(e);
        return n && e.dateYmd ? { n, ymd: e.dateYmd } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.ymd.localeCompare(b.ymd))[0];

    if (any) return dayjs.utc(any.ymd).subtract(any.n - 1, "day");

    // if you track springEquinox in this component, keep your previous fallback here
    return null;
  }, [events /*, springEquinox*/]);

  // Explanation Panel
  // Build explanation lines for the visible month from events
  const explanationItems = useMemo(
    () => computeExplanationItems(byDay, selectedMonth),
    [byDay, selectedMonth]
  );

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
    const firstOfMonth = selectedMonth.utc().startOf("month");
    // Sunday-start grid anchor
    const gridStart =
      firstOfMonth.day() === 0
        ? firstOfMonth
        : firstOfMonth.subtract(firstOfMonth.day(), "day"); // move back to Sunday

    for (let i = 0; i < 42; i++) {
      const d = gridStart.add(i, "day");
      const isCurrentMonth = d.month() === selectedMonth.month();
      const ymd = d.format("YYYY-MM-DD");
      const todayEvents = isCurrentMonth ? byDay[ymd] || [] : [];

      const hasSabbathEvent = todayEvents.some(isSabbath);
      const hasFeastEvent = todayEvents.some(isFeast);

      const cellClass = composeCellClass({
        isCurrentMonth,
        hasSabbathEvent,
        hasFeastEvent,
      });

      const labels = extractFeastLabels(todayEvents);
      const key = ymd;

      cells.push(
        <div key={key} className={cellClass}>
          <div className="text-xs font-semibold">{d.format("MMM D")}</div>

          {labels.length ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {labels.map((l) => (
                <span
                  key={l}
                  className="text-[10px] px-1 py-0.5 rounded bg-gray-800 text-white"
                >
                  {l}
                </span>
              ))}
            </div>
          ) : null}

          {/* Show any non-Day labels (e.g., custom notes) */}
          {(todayEvents || [])
            .filter((e) => !/^\s*day\s*\d{1,3}\s*$/i.test(getTitle(e)))
            .map((e, idx) => (
              <div key={e.id || idx} className="text-[11px] mt-1 truncate">
                {Array.isArray(e.description) && e.description.length
                  ? e.description.join(", ")
                  : getTitle(e)}
              </div>
            ))}
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
      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-600">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-300">{renderCells()}</div>

      {/* Explanation panel (it hides itself on 404/empty by design) */}
      <ExplanationPanel
        year={selectedMonth.year()}
        month={selectedMonth.month() + 1}
        items={explanationItems}
      />
    </div>
  );
}
