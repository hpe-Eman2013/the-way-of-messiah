import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

export default function DonationSuccess() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("session_id");
    if (!id) return;
    fetch(`${API_BASE}/donations/session/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const dollars = data ? (data.amount_total / 100).toFixed(2) : "";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <h1 className="text-2xl font-bold">Thank you!</h1>
      <p className="mt-2 text-gray-700">
        {data
          ? `We received your ${
              data.frequency
            } donation of $${dollars}. A receipt was sent to ${
              data.email || "your email"
            }.`
          : "Verifying your payment…"}
      </p>
    </div>
  );
}
