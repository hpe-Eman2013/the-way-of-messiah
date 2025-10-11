// src/pages/DonateThankYou.jsx
import { useEffect, useState } from "react";

export default function DonateThankYou() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const sid = new URLSearchParams(location.search).get("session_id") 
           || new URLSearchParams(location.search).get("sid");

  useEffect(() => {
    if (!sid) return;
    const API = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
    fetch(`${API}/api/donations/session/${sid}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Lookup failed");
        setData(j);
      })
      .catch((e) => setErr(e.message));
  }, [sid]);

  if (!sid) return <p>Missing session id.</p>;
  if (err) return <p style={{color:"crimson"}}>{err}</p>;
  if (!data) return <p>Loading…</p>;

  const dollars = (data.amount_total ?? 0) / 100;
  return (
    <div style={{maxWidth:600,margin:"2rem auto",padding:"1rem"}}>
      <h1>Thank you!</h1>
      <p>We received your {data.frequency} donation of <strong>${dollars.toFixed(2)}</strong>.</p>
      {data.email && <p>Receipt will be sent to <strong>{data.email}</strong>.</p>}
    </div>
  );
}
