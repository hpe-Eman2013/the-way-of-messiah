import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { fetchEventsForMonth } from "../lib/calendarApi";
import {
  normalizeEvent,
  groupByDay,
  isSabbath,
  isFeast,
  extractFeastLabels,
  computeExplanationItems,
  composeCellClass,
  getTitle,
} from "../lib/calendarHelpers";

dayjs.extend(utc);

export default function CalendarView() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs.utc("2025-04-01"));
  const [events, setEvents] = useState([]);

  // Fetch month events
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
        console.error("month fetch failed", e);
        if (!cancel) setEvents([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [selectedMonth]);

  const byDay = useMemo(() => groupByDay(events), [events]);

  // Compute number of rows: 5 unless the month truly needs 6
  const firstOfMonth = selectedMonth.utc().startOf("month");
  const firstWeekday = firstOfMonth.day(); // 0=Sun
  const daysInMonth = firstOfMonth.daysInMonth();
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  const rows = weeks === 6 ? 6 : 5;
  const gridStart = firstOfMonth.subtract(firstWeekday, "day");

  const explanationItems = useMemo(
    () => computeExplanationItems(byDay, selectedMonth),
    [byDay, selectedMonth]
  );

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

      cells.push(
        <div key={ymd} className={cellClass}>
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

  const goPrev = () => setSelectedMonth((m) => m.subtract(1, "month"));
  const goNext = () => setSelectedMonth((m) => m.add(1, "month"));
  const goToday = () => setSelectedMonth(dayjs.utc().startOf("month"));

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={goPrev} className="px-3 py-1 rounded bg-gray-200">
          ← Prev
        </button>
        <button onClick={goToday} className="px-3 py-1 rounded bg-gray-200">
          Today
        </button>
        <button onClick={goNext} className="px-3 py-1 rounded bg-gray-200">
          Next →
        </button>
        <div className="ml-4 font-semibold">
          {selectedMonth.format("YYYY-MM")}
        </div>
      </div>

      <div className="grid grid-cols-7 text-xs font-semibold text-center mb-1">
        {[
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ].map((d) => (
          <div key={d} className="py-1 bg-gray-100">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-300">{renderCells()}</div>

      <div className="mt-4 border rounded p-3">
        <div className="font-semibold mb-1">
          Explanations for Set-Apart Days
        </div>
        {explanationItems.length === 0 ? (
          <div className="text-sm text-gray-600">
            No notes yet for this month.
          </div>
        ) : (
          <ul className="text-sm space-y-1 max-h-48 overflow-auto pr-1">
            {explanationItems.map((it) => (
              <li key={it.ymd}>
                <span className="font-medium">{it.humanDate}:</span>{" "}
                {it.labels.join(", ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
