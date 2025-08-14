import { useMemo, useState, useEffect } from "react";

export default function DonatePage() {
  const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

  const PRESETS = [10, 25, 50, 100, 250];
  const [amount, setAmount] = useState(10);
  const [custom, setCustom] = useState("");
  const [monthly, setMonthly] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Success / Canceled banners via query params ---
  const params = new URLSearchParams(window.location.search);
  const success = params.get("success") === "1";
  const canceled = params.get("canceled") === "1";

  // Optionally clear the query after showing a message
  useEffect(() => {
    if (success || canceled) {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, [success, canceled]);

  const finalAmount = useMemo(() => {
    const c = Number(custom);
    if (!Number.isNaN(c) && c > 0) return Math.round(c * 100) / 100;
    return amount;
  }, [custom, amount]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const dollars = finalAmount;
    if (!dollars || dollars <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      setLoading(true);
      const successUrl = `${window.location.origin}/donate?success=1`;
      const cancelUrl = `${window.location.origin}/donate?canceled=1`;

      let endpoint = `${BASE_URL}/api/donations/checkout`;
      let body = { amount: dollars, email, note, successUrl, cancelUrl };

      if (monthly) {
        endpoint = `${BASE_URL}/api/donations/subscription`;
        body = { tierAmount: dollars, email, note, successUrl, cancelUrl };
      }

      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || "Payment creation failed");
      }
      const data = await r.json();

      if (data.url) {
        window.location.href = data.url; // Stripe Checkout URL
      } else if (data.sessionUrl) {
        window.location.href = data.sessionUrl; // alt shape if your API returns sessionUrl
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Support The Way of Messiah</h1>
      <p className="text-gray-700 mb-6">
        Your gift helps us keep teaching, building tools like the Enoch calendar, and sharing Yahuah's ways. Thank you!
      </p>

      {/* Success / Canceled banners */}
      {success && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 p-3">
          Thank you! Your <strong>test</strong> donation succeeded.
        </div>
      )}
      {canceled && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-800 p-3">
          Checkout was canceled — you were not charged.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5 bg-white p-5 rounded-2xl shadow">
        {/* Amount presets */}
        <div>
          <label className="block text-sm font-medium mb-2">Choose an amount</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => { setAmount(v); setCustom(""); }}
                className={`px-3 py-2 rounded border ${finalAmount === v && !custom ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                ${v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">or other:</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Enter amount"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="pl-6 pr-3 py-2 rounded border w-40"
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">Final amount: <strong>${finalAmount.toFixed(2)}</strong></p>
        </div>

        {/* One-time vs Monthly */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="scale-110" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} />
            <span>Make this a <strong>monthly</strong> gift</span>
          </label>
        </div>

        {/* Donor info */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email (for receipt)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded border px-3 py-2" rows={3} placeholder="Add a note or prayer request" />
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-xl text-white ${loading ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {loading ? 'Preparing secure checkout…' : (monthly ? `Give $${finalAmount.toFixed(2)} / month` : `Give $${finalAmount.toFixed(2)} now`)}
        </button>

        <p className="text-xs text-gray-500 mt-2">Payments are processed securely by Stripe. Apple Pay & Google Pay supported where available.</p>
      </form>

      <div className="mt-6 text-sm text-gray-600">
        <p>
          Prefer Zelle/CashApp/PayPal? Email us and we’ll send current details. If you need a year-end statement, keep your email consistent so we can match gifts.
        </p>
      </div>
    </div>
  );
}
