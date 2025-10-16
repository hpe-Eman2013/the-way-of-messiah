import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { fetchEventsForMonth } from "../lib/calendarApi"; // adjust path if different
dayjs.extend(utc);

// tiny helpers
const keyFromEvent = (e) => e?.dateYmd ?? e?.dateISO?.slice(0, 10) ?? null;

export default function EventsList() {
  // start on current month in UTC
  const [month, setMonth] = useState(dayjs.utc().startOf("month"));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  // fetch month
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await fetchEventsForMonth(month.year(), month.month());
        if (!cancel) setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("EventsList fetch failed:", e);
        if (!cancel) {
          setErr("Failed to load events");
          setEvents([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [month]);

  // simple client-side filter (title/description/category)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((e) => {
      const title = (e.title || "").toLowerCase();
      const cat   = (e.category || "").toLowerCase();
      const desc  = Array.isArray(e.description)
        ? e.description.join(" ").toLowerCase()
        : (e.description || "").toLowerCase();
      return title.includes(needle) || cat.includes(needle) || desc.includes(needle);
    });
  }, [events, q]);

  // stable sort (dateYmd/title/id) just in case
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ak = keyFromEvent(a) || "";
      const bk = keyFromEvent(b) || "";
      if (ak !== bk) return ak.localeCompare(bk);
      const at = (a.title || "");
      const bt = (b.title || "");
      if (at !== bt) return at.localeCompare(bt);
      return (a.id || a._id || "").localeCompare(b.id || b._id || "");
    });
  }, [filtered]);

  const prevMonth = () => setMonth((m) => m.subtract(1, "month"));
  const nextMonth = () => setMonth((m) => m.add(1, "month"));

  return (
    <div className="p-4 space-y-4">
      {/* Header / Controls */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h1 className="text-xl font-semibold">
          Events — {month.format("YYYY-MM")}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
          >
            ← Prev
          </button>
          <button
            onClick={() => setMonth(dayjs.utc().startOf("month"))}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, category, description…"
          className="border rounded w-full max-w-lg px-3 py-2"
        />
      </div>

      {/* Status */}
      {loading && <div>Loading…</div>}
      {err && <div className="text-red-600">{err}</div>}

      {/* Table */}
      {!loading && !err && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Description</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-gray-500">
                    No events for this month.
                  </td>
                </tr>
              )}
              {sorted.map((e, idx) => {
                const ymd = keyFromEvent(e) || "";
                const desc = Array.isArray(e.description)
                  ? e.description.join(", ")
                  : (e.description || "");
                return (
                  <tr key={e.id ?? e._id ?? idx} className="border-b align-top">
                    <td className="py-2 pr-4 whitespace-nowrap">{ymd}</td>
                    <td className="py-2 pr-4">{e.title || ""}</td>
                    <td className="py-2 pr-4">{e.category || ""}</td>
                    <td className="py-2 pr-4">{desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
