import { useMemo, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import API_BASE from "../lib/api";

const PRESETS = [10, 25, 50, 100, 250];

export default function DonationPage() {
  const [mode, setMode] = useState("one-time"); // 'one-time' | 'monthly'
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [coverFees, setCoverFees] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Fee settings (adjust to your Stripe plan if needed)
  const FEE_RATE = 0.029; // 2.9%
  const FEE_FIXED = 0.3; // $0.30

  const cleanNumber = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const x = v.replace(/[^0-9.\-]/g, "");
      const n = Number(x);
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  };

  const baseAmount = useMemo(() => {
    const c = cleanNumber(custom);
    if (Number.isFinite(c) && c > 0) return c;
    return amount;
  }, [custom, amount]);

  const totalAmount = useMemo(() => {
    const a = Math.max(1, Math.min(baseAmount, 100000));
    if (!coverFees) return a;
    // gross-up: amount the donor pays so that net after fees ≈ a
    // Solve for T: T - (T*rate + fixed) = a  =>  T = (a + fixed) / (1 - rate)
    const gross = (a + FEE_FIXED) / (1 - FEE_RATE);
    return Math.round(gross * 100) / 100;
  }, [baseAmount, coverFees]);

  const onPreset = (v) => {
    setCustom("");
    setAmount(v);
  };

  const startCheckout = async () => {
    try {
      setLoading(true);
      const endpoint =
        mode === "monthly" ? "/donations/subscription" : "/donations/checkout";

      const payload =
        mode === "monthly"
          ? { tierAmount: totalAmount, email, note, name }
          : { amount: totalAmount, email, note, name };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start checkout");
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err) {
      alert(err.message || "Unable to start checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-5xl p-6">
          <header className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">
              Support The Way of Messiah
            </h1>
            <p className="text-gray-600 mt-1">
              Your gift helps us develop studies, host events, and maintain the
              platform.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Left column */}
            <section className="md:col-span-2 space-y-6">
              {/* Frequency toggle */}
              <div className="bg-white rounded-2xl shadow p-5">
                <div className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
                  {["one-time", "monthly"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-4 py-2 font-medium transition ${
                        mode === m
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {m === "one-time" ? "One-time" : "Monthly"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  You can change/cancel monthly support any time.
                </p>
              </div>

              {/* Amount */}
              <div className="bg-white rounded-2xl shadow p-5">
                <h2 className="text-lg font-semibold mb-3">Choose an amount</h2>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => onPreset(p)}
                      className={`px-4 py-2 rounded-xl border transition
                        ${
                          !custom && baseAmount === p
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-900 border-gray-300 hover:border-gray-900"
                        }`}
                    >
                      ${p}
                    </button>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">or</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">$</span>
                      <input
                        inputMode="decimal"
                        type="text"
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                        placeholder="Custom"
                        className="w-28 rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 mt-4 select-none">
                  <input
                    type="checkbox"
                    checked={coverFees}
                    onChange={(e) => setCoverFees(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">
                    Cover processing fees (optional)
                  </span>
                </label>

                <p className="text-xs text-gray-500 mt-2">
                  Min $1, Max $100,000. Amounts are in USD.
                </p>
              </div>

              {/* Donor info */}
              <div className="bg-white rounded-2xl shadow p-5">
                <h2 className="text-lg font-semibold mb-3">
                  Your information (optional)
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <label className="block text-sm text-gray-700 mb-1 mt-4">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Message to include with your donation"
                />
              </div>
            </section>

            {/* Right column: Summary */}
            <aside className="md:col-span-1">
              <div className="bg-white rounded-2xl shadow p-5 sticky top-6">
                <h3 className="text-lg font-semibold">Summary</h3>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>
                      {mode === "monthly"
                        ? "Monthly donation"
                        : "One-time donation"}
                    </span>
                    <span>${baseAmount.toFixed(2)}</span>
                  </div>
                  {coverFees && (
                    <div className="flex justify-between">
                      <span>With fees covered</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <button
                  disabled={loading || totalAmount < 1}
                  onClick={startCheckout}
                  className={`w-full mt-6 rounded-xl px-4 py-3 font-semibold transition
                    ${
                      loading
                        ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                        : "bg-gray-900 text-white hover:opacity-90"
                    }
                  `}
                >
                  {loading ? "Starting checkout…" : "Donate"}
                </button>
                <p className="text-xs text-gray-500 mt-3">
                  You’ll be redirected to a secure Stripe Checkout page.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
