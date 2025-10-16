// src/api/calendarApi.js

// Ensure your .env has VITE_API_URL pointing at your backend base (e.g., http://localhost:10000 or https://api.wayofmessiah.net)
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, ""); // trim trailing slash

const toYMD = (d) => d.toISOString().slice(0, 10);

/**
 * Fetch events for a specific Gregorian month (UTC boundaries).
 * @param {number} year  - e.g., 2025
 * @param {number} month0 - 0=Jan ... 11=Dec
 */
export async function fetchEventsForMonth(year, month0) {
  const from = toYMD(new Date(Date.UTC(year, month0, 1)));
  const to   = toYMD(new Date(Date.UTC(year, month0 + 1, 1)));

  const res = await fetch(`${BASE}/api/events?from=${from}&to=${to}`);
  if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
  return res.json();
}

/**
 * Fetch events for an arbitrary UTC date range (YYYY-MM-DD strings).
 */
export async function fetchEventsRange(fromYmd, toYmd) {
  const res = await fetch(`${BASE}/api/events?from=${fromYmd}&to=${toYmd}`);
  if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
  return res.json();
}
