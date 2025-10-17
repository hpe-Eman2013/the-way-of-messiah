import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export default function ExplanationPanel({ year, month, onLoaded }) {
  const [items, setItems] = useState([]); // always an array
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
        const r = await fetch(
          `${base}/api/explanations?year=${year}&month=${month}`
        );

        // If the route doesn't exist yet, show nothing (no crash)
        if (r.status === 404) {
          if (!cancel) setItems([]);
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const data = await r.json();
        // Accept either an array or an object with { items: [...] }
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        if (!cancel) setItems(arr);
      } catch (_) {
        if (!cancel) setItems([]); // fail-closed to empty array
      } finally {
        if (!cancel) {
          setLoading(false);
          onLoaded && onLoaded();
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [year, month, onLoaded]);

  if (loading) return null; // or keep your "Loading…" if you want

  // Guard: only filter if it's an array
  const holyDayItems = Array.isArray(items)
    ? items.filter((it) => !/^day\s*\d+$/i.test(String(it?.name ?? "")))
    : [];

  if (holyDayItems.length === 0) return null;

  return (
    <div className="explanations">
      <h3>Explanations for Set-Apart Days</h3>
      {holyDayItems.map((it, i) => {
        const ex = it?.explanation || {};
        const ymd =
          it?.date_utc ??
          (it?.date ? dayjs.utc(it.date).format("YYYY-MM-DD") : "");
        return (
          <div key={i} className="explanation-card">
            <div className="ex-date-title">
              {ymd ? `${ymd}: ` : ""}
              {it?.name ?? ""}
            </div>
            <p>
              <strong>Purpose:</strong> {ex.purpose ?? "—"}
            </p>
            <p>
              <strong>Length:</strong> {ex.length ?? "—"}
            </p>
            <p>
              <strong>Restrictions:</strong> {ex.restrictions ?? "—"}
            </p>
            <p>
              <strong>When Observed:</strong> {ex.when_observed ?? "—"}
            </p>
            <p>
              <strong>Who It Was Binding On:</strong>{" "}
              {ex.who_it_was_binding_on ?? "—"}
            </p>
            <p>
              <strong>Customs:</strong> {ex.customs ?? "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
