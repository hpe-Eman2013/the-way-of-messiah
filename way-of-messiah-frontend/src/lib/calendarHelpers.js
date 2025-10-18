// Centralized helpers for the Enoch calendar views
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

/** Normalize one raw event from the API/DB into a shape the calendar expects */
export const normalizeEvent = (e) => {
  // Accept several possible date fields; convert to YYYY-MM-DD (UTC)
  const iso = e?.dateYmd || e?.date || e?.when || e?.startDate;
  const ymd = iso ? dayjs.utc(iso).format("YYYY-MM-DD") : null;

  // Normalize description → array of strings for easy scanning
  const descArr = Array.isArray(e?.description)
    ? e.description
    : e?.description
    ? [String(e.description)]
    : [];

  return {
    id: e?._id || e?.id,
    title: String(e?.title ?? e?.name ?? "").trim(),
    name: e?.name,
    category: e?.category,
    description: descArr, // always an array now
    dateYmd: ymd,
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

/** Extract the Enoch day number from a title like "Day 59" */
export const parseDayNumber = (e) => {
  const t = getTitle(e).toLowerCase();
  const m = t.match(/\bday\s*(\d{1,3})\b/);
  return m ? Number(m[1]) : null;
};

/** Build lowercase text to search for Sabbath/Feast keywords */
const buildSearchText = (e) => {
  const parts = [];
  if (Array.isArray(e?.description)) parts.push(e.description.join(" "));
  else if (e?.description) parts.push(String(e.description));
  parts.push(e?.title, e?.name, e?.category);
  return parts.filter(Boolean).join(" ").toLowerCase();
};

export const isSabbath = (e) => buildSearchText(e).includes("sabbath");

const FEAST_KEYWORDS = [
  "passover",
  "unleavened",
  "firstfruits",
  "weeks", // Shavuot
  "pentecost",
  "trumpets",
  "atonement",
  "tabernacles",
  "sukkot",
  "dedication",
  "hanukkah",
];

export const isFeast = (e) => {
  const t = buildSearchText(e);
  return FEAST_KEYWORDS.some((k) => t.includes(k));
};

/** Get a compact label string for a day's feasts (e.g., "Passover, Unleavened Bread") */
export const extractFeastLabels = (eventsForDay) => {
  const labels = new Set();
  (eventsForDay || []).forEach((e) => {
    if (isSabbath(e)) labels.add("Sabbath");
    // prefer explicit description labels if present
    if (Array.isArray(e.description)) {
      e.description.forEach((d) => {
        const s = String(d).trim();
        if (s) labels.add(s);
      });
    } else if (isFeast(e)) {
      // fallback: infer from text
      const text = buildSearchText(e);
      FEAST_KEYWORDS.forEach((k) => {
        if (text.includes(k)) labels.add(k[0].toUpperCase() + k.slice(1));
      });
    }
  });
  return Array.from(labels);
};

/** Explanation list builder used by the bottom panel */
export const computeExplanationItems = (byDay, selectedMonth) => {
  const items = [];
  const year = selectedMonth.year();
  const month = selectedMonth.month() + 1;
  const daysInMonth = selectedMonth.daysInMonth();

  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = dayjs
      .utc({ year, month: month - 1, date: d })
      .format("YYYY-MM-DD");
    const events = byDay[ymd] || [];
    if (!events.length) continue;

    const labels = extractFeastLabels(events);
    if (labels.length) {
      items.push({
        ymd,
        humanDate: dayjs.utc(ymd).format("MMM D"),
        labels,
      });
    }
  }
  return items;
};

/** Basic cell ring class logic (you may already have this) */
export const composeCellClass = ({
  isCurrentMonth,
  hasSabbathEvent,
  hasFeastEvent,
}) => {
  const rings = hasSabbathEvent
    ? "ring-2 ring-orange-400"
    : hasFeastEvent
    ? "ring-2 ring-red-500"
    : "";
  return `${isCurrentMonth ? "bg-white" : "bg-gray-100"} ${rings}`;
};
