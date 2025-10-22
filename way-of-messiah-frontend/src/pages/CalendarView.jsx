// src/pages/CalendarView.jsx
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

// We will fetch directly from CAL_BASE to avoid any helper mismatch
import { CAL_BASE } from "../lib/api";

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
} from "../lib/calendarHelpers";

export default function CalendarView() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs.utc().startOf("month"));
  const [events, setEvents] = useState([]);
  const [debug, setDebug] = useState({ url: "", error: "", rawType: "", loaded: 0 });

  // --- Month boundaries (UTC) ---
  const firstOfMonth = selectedMonth.utc().startOf("month");
  const firstWeekday = firstOfMonth.day(); // 0=Sun..6=Sat
  const daysInMonth = firstOfMonth.daysInMonth();
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  const rows = weeks === 6 ? 6 : 5;
  const gridStart = firstOfMonth.subtract(firstWeekday, "day");

  // --- Direct fetch to backend, normalize shape ---
  useEffect(() => {
    let cancel = false;

    (async () => {
      const from = firstOfMonth.format("YYYY-MM-01");
      const to = firstOfMonth.add(1, "month").format("YYYY-MM-01");
      const url = `${CAL_BASE}/events?from=${from}&to=${to}`;

      try {
        setDebug((d) => ({ ...d, url, error: "", rawType: "…" }));

        const r = await fetch(url, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const json = await r.json();
        const arr = Array.isArray(json)
          ? json
          : Array.isArray(json?.events)
          ? json.events
          : Array.isArray(json?.items)
          ? json.items
          : [];

        const safe = (arr || []).map(normalizeEvent);

        if (!cancel) {
          setEvents(safe);
          setDebug((d) => ({
            ...d,
            rawType: Array.isArray(json) ? "array" : json?.events ? "{events}" : json?.items ? "{items}" : "other",
            loaded: safe.length,
            error: "",
          }));
        }
      } catch (e) {
        if (!cancel) {
          setEvents([]);
          setDebug((d) => ({ ...d, error: String(e?.message || e), loaded: 0 }));
        }
      }
    })();

    return () => {
      cancel = true;
    };
  }, [CAL_BASE, firstOfMonth]); // re-fetch whenever month changes

  // Group by day
  const byDay = useMemo(() => groupByDay(events), [events]);

  // Anchor for Enoch "Day N": earliest event with a "Day N" title
  const enochAnchor = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    const earliest = list
      .map((e) => {
        const n = parseDayNumber(e);
        return n && e.dateYmd ? { n, ymd: e.dateYmd } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.ymd.localeCompare(b.ymd))[0];

    return earliest ? dayjs.utc(earliest.ymd).subtract(earliest.n - 1, "day") : null;
  }, [events]);

  const calculateEnochDay = (dateObj) => {
    if (!enochAnchor) return null;
    const ymd = dayjs.utc(dateObj).format("YYYY-MM-DD");
    return dayjs.utc(ymd).diff(enochAnchor, "day") + 1;
  };

  // Bottom panel items
  const explanationItems = useMemo(
    () => computeExplanationItems(byDay, selectedMonth),
    [byDay, selectedMonth]
  );

  const goPrev = () => setSelectedMonth((m) => m.subtract(1, "month"));
  const goNext = () => setSelectedMonth((m) => m.add(1, "month"));
  const goToday = () => setSelectedMonth(dayjs.utc().startOf("month"));

  const renderCells = () => {
    const cells = [];
    const total = rows * 7;

    for (let i = 0; i < total; i++) {
      const d = gridStart.add(i, "day");
      const isCurrentMonth = d.month() === selectedMonth.month();
      const ymd = d.format("YYYY-MM-DD");
      const todaysEvents = isCurrentMonth ? byDay[ymd] || [] : [];

      const hasSabbathEvent = todaysEvents.some(isSabbath);
      const hasFeastEvent = todaysEvents.some(isFeast);
      const labels = extractFeastLabels(todaysEvents);

      const cellClass = composeCellClass({
        isCurrentMonth,
        hasSabbathEvent,
        hasFeastEvent,
      });
      const enochDay = isCurrentMonth ? calculateEnochDay(d) : null;

      cells.push(
        <div key={ymd} className={cellClass}>
          {/* Gregorian date (blank for outside-month cells) */}
          <div className="text-xs font-semibold">
            {isCurrentMonth ? d.format("MMM D") : ""}
          </div>

          {/* Enoch Day N */}
          {isCurrentMonth && enochDay ? (
            <div className="text-[11px] text-gray-600">Day {enochDay}</div>
          ) : null}

          {/* Feast/Sabbath chips */}
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

          {/* Optional extra lines (non-"Day N" titles / descriptions) */}
          {(todaysEvents || [])
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
    <div className="max-w-6xl mx-auto p-4">
      {/* Title + subtitle */}
      <h1 className="text-center text-2xl font-bold">CONSECRATED DAYS OF YAHUAH</h1>
      <div className="text-center text-sm text-gray-600 mb-3">
        {selectedMonth.format("MMMM YYYY")} — Enoch 364 Day Calendar
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={goPrev} className="px-3 py-1 rounded bg-gray-200">← Prev</button>
        <button onClick={goToday} className="px-3 py-1 rounded bg-gray-200">Today</button>
        <button onClick={goNext} className="px-3 py-1 rounded bg-gray-200">Next →</button>
        <div className="ml-4 font-semibold">{selectedMonth.format("YYYY-MM")}</div>
      </div>

      {/* DEBUG (remove later) */}
      <div className="text-xs text-gray-700 mb-2 border rounded px-2 py-1 bg-gray-50">
        <div><b>GET</b> {debug.url || "(building…)"}</div>
        <div>
          result: <b>{debug.loaded}</b> events
          {" • "}shape: <b>{debug.rawType || "n/a"}</b>
          {debug.error ? <> {" • "}error: <span className="text-red-600">{debug.error}</span></> : null}
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-xs font-semibold text-center mb-1">
        {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d) => (
          <div key={d} className="py-1 bg-gray-100">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-300">
        {renderCells()}
      </div>

      {/* Explanations */}
      <div className="mt-4 border rounded p-3">
        <div className="font-semibold mb-1">Explanations for Set-Apart Days</div>
        {explanationItems.length === 0 ? (
          <div className="text-sm text-gray-600">No notes yet for this month.</div>
        ) : (
          <ul className="text-sm space-y-1 max-h-48 overflow-auto pr-1">
            {explanationItems.map((it) => (
              <li key={it.ymd}>
                <span className="font-medium">{dayjs.utc(it.ymd).format("MMM D")}:</span>{" "}
                {it.labels.join(", ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
