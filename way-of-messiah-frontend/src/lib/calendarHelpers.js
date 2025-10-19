// src/lib/calendarHelpers.js
// Centralized helpers for the Enoch calendar views

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

/** Build lowercase text to search for Sabbath/Feast keywords */
export const buildSearchText = (e) => {
  const parts = [];
  if (Array.isArray(e?.description)) parts.push(e.description.join(" "));
  else if (e?.description) parts.push(String(e.description));
  parts.push(e?.title, e?.name, e?.category);
  return parts.filter(Boolean).join(" ").toLowerCase();
};

/** Normalize one raw event into a consistent shape */
export const normalizeEvent = (e) => {
  const iso = e?.dateYmd || e?.date || e?.when || e?.startDate;
  const ymd = iso ? dayjs.utc(iso).format("YYYY-MM-DD") : null;

  const descArr = Array.isArray(e?.description)
    ? e.description
    : e?.description
    ? [String(e.description)]
    : [];

  const searchText = [e?.title, e?.name, e?.category, ...(descArr || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    id: e?._id || e?.id || `${ymd}:${(e?.title ?? e?.name ?? "").trim()}`,
    title: String(e?.title ?? e?.name ?? "").trim(),
    name: e?.name,
    category: e?.category,
    description: descArr, // always an array
    dateYmd: ymd, // YYYY-MM-DD (UTC)
    searchText, // for fast contains()
    raw: e,
  };
};

/** Group events by UTC YYYY-MM-DD */
export const groupByDay = (events) =>
  (Array.isArray(events) ? events : []).reduce((acc, ev) => {
    const key = ev?.dateYmd;
    if (!key) return acc;
    (acc[key] ||= []).push(ev);
    return acc;
  }, {});

/** Preferred display title */
export const getTitle = (e) => String(e?.title ?? e?.name ?? "").trim();

/** Extract “Day N” from a title like "Day 59" */
export const parseDayNumber = (e) => {
  const t = getTitle(e).toLowerCase();
  const m = t.match(/\bday\s*(\d{1,3})\b/);
  return m ? Number(m[1]) : null;
};

/** Back-compat: stable key */
export const keyFromEvent = (e) =>
  (e?.id ?? e?._id ?? `${e?.dateYmd ?? ""}:${getTitle(e)}`).toString();

/** Sabbath / Feast detectors */
export const isSabbath = (e) => e?.searchText?.includes("sabbath");

const FEAST_KEYS = [
  "passover",
  "unleavened",
  "firstfruits",
  "weeks",
  "pentecost",
  "trumpets",
  "atonement",
  "tabernacles",
  "sukkot",
  "dedication",
  "hanukkah",
];

export const isFeast = (e) =>
  FEAST_KEYS.some((k) => e?.searchText?.includes(k));

/** Labels for a day (e.g., ["Sabbath","Passover"]) */
export const extractFeastLabels = (eventsForDay) => {
  const labels = new Set();
  (eventsForDay || []).forEach((e) => {
    if (isSabbath(e)) labels.add("Sabbath");
    if (Array.isArray(e.description) && e.description.length) {
      e.description.forEach((d) => {
        const s = String(d).trim();
        if (s) labels.add(s);
      });
    } else if (isFeast(e)) {
      FEAST_KEYS.forEach((k) => {
        if (e.searchText.includes(k))
          labels.add(k[0].toUpperCase() + k.slice(1));
      });
    }
  });
  return Array.from(labels);
};

/** Build the bottom explanation list for the visible month */
export const computeExplanationItems = (byDay, selectedMonth) => {
  const first = selectedMonth.utc().startOf("month");
  const days = first.daysInMonth();
  const items = [];
  for (let d = 1; d <= days; d++) {
    const ymd = first.date(d).format("YYYY-MM-DD");
    const labels = extractFeastLabels(byDay[ymd] || []);
    if (labels.length) {
      items.push({ ymd, humanDate: first.date(d).format("MMM D"), labels });
    }
  }
  return items;
};

/** Compose cell class with fixed height */
export const composeCellClass = ({
  isCurrentMonth,
  hasSabbathEvent,
  hasFeastEvent,
}) => {
  const base = "border p-2 min-h-[110px] flex flex-col";
  const tint = hasSabbathEvent
    ? " ring-2 ring-orange-400 ring-offset-1 ring-offset-gray-200 bg-orange-50"
    : hasFeastEvent
    ? " ring-2 ring-red-500 ring-offset-1 ring-offset-gray-200 bg-red-50"
    : "";
  const shade = isCurrentMonth ? " bg-white" : " bg-gray-100 opacity-60";
  return base + tint + shade;
};
