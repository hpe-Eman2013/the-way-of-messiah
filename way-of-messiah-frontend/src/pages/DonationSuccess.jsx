import { useEffect, useState } from "react";

export default function DonationSuccess() {
  const [data, setData] = useState(null);
  const base = import.meta.env.VITE_API_URL || "http://localhost:10000";

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    if (!id) return;
    fetch(`${base}/api/donations/session/${id}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const dollars = data ? (data.amount_total / 100).toFixed(2) : "";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <h1 className="text-2xl font-bold">Thank you!</h1>
      <p className="mt-2 text-gray-700">
        {data
          ? `We received your ${data.frequency} donation of $${dollars}. A receipt was sent to ${data.email || "your email"}.`
          : "Verifying your payment…"}
      </p>
    </div>
  );
}
