import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import CAL_BASE from "./apiBase.js";
dayjs.extend(utc);

export async function fetchEventsForMonth(year, monthZeroIndexed) {
  const from = dayjs
    .utc({ year, month: monthZeroIndexed, date: 1 })
    .format("YYYY-MM-01");
  const to = dayjs
    .utc({ year, month: monthZeroIndexed, date: 1 })
    .add(1, "month")
    .format("YYYY-MM-01");
  const url = `${CAL_BASE}/events?from=${from}&to=${to}`; // <-- no extra /api here
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

/**
 * Fetch events for an arbitrary UTC date range (YYYY-MM-DD strings).
 */
export async function fetchEventsRange(fromYmd, toYmd) {
  const res = await fetch(`${CAL_BASE}/api/events?from=${fromYmd}&to=${toYmd}`);
  if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
  return res.json();
}
