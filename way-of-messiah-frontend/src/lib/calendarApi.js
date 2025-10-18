import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { CAL_BASE } from "./api.js";
dayjs.extend(utc);

export async function fetchEventsForMonth(year, monthZeroIndexed) {
  const from = dayjs
    .utc({ year, month: monthZeroIndexed, date: 1 })
    .format("YYYY-MM-01");
  const to = dayjs
    .utc({ year, month: monthZeroIndexed, date: 1 })
    .add(1, "month")
    .format("YYYY-MM-01");
  const url = `${CAL_BASE}/events?from=${from}&to=${to}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  const json = await r.json();

  // Normalize to array regardless of shape
  return Array.isArray(json)
    ? json
    : Array.isArray(json?.items)
    ? json.items
    : Array.isArray(json?.events)
    ? json.events
    : [];
}


/**
 * Fetch events for an arbitrary UTC date range (YYYY-MM-DD strings).
 */
export async function fetchEventsRange(fromYmd, toYmd) {
  const res = await fetch(`${CAL_BASE}/events?from=${fromYmd}&to=${toYmd}`);
  if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
  return res.json();
}
