import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

export default function ExplanationPanel({
  year,
  month,
  items: injectedItems = [],
}) {
  const [items, setItems] = useState(injectedItems);

  useEffect(() => {
    setItems(Array.isArray(injectedItems) ? injectedItems : []);
  }, [injectedItems, year, month]);

  return (
    <div className="mt-4 border rounded p-3 bg-gray-50">
      <h3 className="font-semibold mb-2">Explanations for Set-Apart Days</h3>
      {items.length === 0 ? (
        <div className="text-sm text-gray-600">
          No notes yet for this month.
        </div>
      ) : (
        <ul className="list-disc pl-5 space-y-1">
          {items.map((t, i) => (
            <li key={i}>{String(t)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
