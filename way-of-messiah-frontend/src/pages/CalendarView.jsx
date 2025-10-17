import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import axios from "axios";
import { fetchEventsForMonth } from "../lib/calendarApi";
import ExplanationPanel from "../components/ExplanationPanel.jsx";

dayjs.extend(utc);

// ---------- Helpers
const getTitle = (e) => (e?.title ?? e?.name ?? "");
// Returns YYYY-MM-DD for any of the known date fields
const toYmd = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v.slice(0, 10); // "2025-03-21T00:00:00.000Z" → "2025-03-21"
  // if somehow a Date object slipped through
  try { return dayjs.utc(v).format("YYYY-MM-DD"); } catch { return null; }
};
const normalizeEvent = (e) => {
  const id = (e?.id ?? e?._id ?? "").toString();
  const title = e?.title ?? e?.name ?? ""; // tolerate 'name'
  const dateYmd =
    e?.dateYmd ??
    toYmd(e?.dateISO) ??
    toYmd(e?.date) ??
    toYmd(e?.startDate) ??
    null;

  return {
    ...e,
    id,
    title,
    dateYmd,
  };
};
const keyFromEvent = (e) =>
  e?.dateYmd ??
  toYmd(e?.dateISO) ??
  toYmd(e?.date) ??
  toYmd(e?.startDate) ??
  null;

const groupByDay = (items) => {
  const arr = Array.isArray(items) ? items : [];
  return arr.reduce((acc, ev) => {
    const k = keyFromEvent(ev);
    if (!k) return acc;
    (acc[k] ||= []).push(ev);
    return acc;
  }, {});
};
/* // Color cell detectors helpers
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
}; */

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
  const [springEquinox, setSpringEquinox] = useState(null); // 'YYYY-MM-DD' or null

  const byDay = useMemo(() => groupByDay(events), [events]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const raw = await fetchEventsForMonth(
          selectedMonth.year(),
          selectedMonth.month()
        );
        const safe = Array.isArray(raw) ? raw.map(normalizeEvent) : [];
        if (!cancel) setEvents(safe);
      } catch (e) {
        console.error("Error fetching events:", e);
        if (!cancel) setEvents([]);
      }

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

  // ---- Determine a single Day 1 anchor from available data
  const enochAnchor = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    // Prefer explicit Day 1
    const d1 = list.find(
      (e) => parseDayNumber(getTitle(e)) === 1 && keyFromEvent(e)
    );
    if (d1) return dayjs.utc(keyFromEvent(d1));
    // Else derive from any Day N (earliest by date)
    const anyDay = list
      .map((e) => {
        const num = parseDayNumber(getTitle(e));
        const ymd = keyFromEvent(e);
        return num && ymd ? { num, ymd } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.ymd.localeCompare(b.ymd))[0];
    if (anyDay) return dayjs.utc(anyDay.ymd).subtract(anyDay.num - 1, "day");
    // Last resort: equinox + 1
    return springEquinox ? dayjs.utc(springEquinox).add(1, "day") : null;
  }, [events, springEquinox]);

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

  // ---- Navigation
  const goPrevMonth = () => setSelectedMonth((m) => m.subtract(1, "month"));
  const goNextMonth = () => setSelectedMonth((m) => m.add(1, "month"));
  const goToday = () => setSelectedMonth(dayjs.utc().startOf("month"));

  // ---- Render month grid (42 cells)
  const renderCells = () => {
    const cells = [];
    const startOfMonthUtc = selectedMonth.utc().startOf("month");
    const firstGridDayUtc = startOfMonthUtc.startOf("week"); // Sunday-start

    for (let i = 0; i < 42; i++) {
      const currentDateUTC = firstGridDayUtc.add(i, "day");
      const currentDateLabel = currentDateUTC; // keep UTC label, or .local() if you prefer
      const isCurrentMonth = currentDateUTC.month() === selectedMonth.month();

      const todayEvents = isCurrentMonth ? getEventsByDate(currentDateUTC) : [];
      const enochDay = calculateEnochDay(currentDateUTC);

      // ---- Coloring rules
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

      // Hide raw "Day N" events (we display computed label instead)
      const displayEvents = todayEvents.filter(
        (e) => !/^\s*day\s*\d{1,3}\s*$/i.test(getTitle(e))
      );

      const key = currentDateUTC.format("YYYY-MM-DD");
      cells.push(
        <div key={key} className={cellClass}>
          <div className="text-xs font-semibold">
            {currentDateLabel.format("MMM D")}
          </div>
          {enochDay ? (
            <div className="text-xs mt-1 font-semibold">Day {enochDay}</div>
          ) : null}
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

      <div className="grid grid-cols-7 gap-px bg-gray-300">{renderCells()}</div>

      {/* Explanation panel hides itself on 404/empty (see its guarded version) */}
      <ExplanationPanel
        year={selectedMonth.year()}
        month={selectedMonth.month() + 1}
      />
    </div>
  );
}
