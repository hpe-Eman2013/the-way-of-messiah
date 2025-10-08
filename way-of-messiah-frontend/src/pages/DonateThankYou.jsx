// src/pages/DonateThankYou.jsx
import { useEffect, useState } from "react";

export default function DonateThankYou() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const params = new URLSearchParams(location.search);
  const sid = params.get("session_id") || params.get("sid");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/donations/session/${sid}`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Lookup failed");
        setData(j);
      } catch (e) { setErr(e.message); }
    })();
  }, [sid]);

  if (!sid) return <p>Missing session id.</p>;
  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <p>Loading…</p>;

  const dollars = (data.amount_total ?? 0) / 100;
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Thank you!</h1>
      <p className="mt-2">We received your {data.frequency} donation of <strong>${dollars.toFixed(2)}</strong>.</p>
      {data.email && <p>Receipt will be sent to <strong>{data.email}</strong>.</p>}
    </div>
  );
}
