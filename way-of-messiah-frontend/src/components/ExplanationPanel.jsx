import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

export default function ExplanationPanel({ year, month }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const base = import.meta.env.VITE_API_URL.replace(/\/$/, '');
        const r = await fetch(`${base}/api/explanations?year=${year}&month=${month}`);
        const data = await r.json();
        if (!cancel) setItems(data);
      } catch {
        if (!cancel) setItems([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [year, month]);

  if (loading) return <div className="explanations">Loading…</div>;

  // ↓↓↓ INSERTED LINE: filter out plain “Day N” rows (belt & suspenders)
  const holyDayItems = items.filter(it => !/^day\s*\d+$/i.test(String(it.name)));

  return (
    <div className="explanations">
      <h3>Explanations for Set-Apart Days</h3>
      {holyDayItems.length === 0 && <div>None this month.</div>}

      {holyDayItems.map((it, i) => {
        const ex = it.explanation || {};
        return (
          <div key={i} className="explanation-card">
            <div className="ex-date-title">
                {it.date_utc ? `${it.date_utc}: ` : (it.date ? `${dayjs.utc(it.date).format('YYYY-MM-DD')}: ` : '')}
                {it.name}
            </div>

            <p><strong>Purpose:</strong> {ex.purpose || '—'}</p>
            <p><strong>Length:</strong> {ex.length || '—'}</p>
            <p><strong>Restrictions:</strong> {ex.restrictions || '—'}</p>
            <p><strong>When Observed:</strong> {ex.when_observed || '—'}</p>
            <p><strong>Who It Was Binding On:</strong> {ex.who_it_was_binding_on || '—'}</p>
            <p><strong>Customs:</strong> {ex.customs || '—'}</p>
          </div>
        );
      })}
    </div>
  );
}
