// src/lib/calendarHelpers.js
// Centralized helpers for the Enoch calendar views
// Keep your components lean by importing from here.

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

/** Normalize an event coming from the API */
export const normalizeEvent = (e) => {
  const id = (e?.id ?? e?._id ?? "").toString();
  const title = e?.title ?? e?.name ?? "";
  const description = Array.isArray(e?.description)
    ? e.description.map(String)
    : e?.description
    ? [String(e.description)]
    : [];

  // prefer server-provided dateYmd; fallback to ISO fields
  const dateYmd =
    e?.dateYmd ??
    (e?.dateISO ? e.dateISO.slice(0, 10) : null) ??
    (e?.startDateISO ? e.startDateISO.slice(0, 10) : null);

  const searchText = buildSearchText({ ...e, title, description });
  return { ...e, id, title, description, dateYmd, searchText };
};

/** Safe text access for detectors */
export const eventText = (e) => e?.searchText ?? buildSearchText(e);

/** Detects Sabbath from event text */
export const isSabbath = (e) => eventText(e).includes("sabbath");

/** Detects any Feast from event text */
export const isFeast = (e) =>
  /passover|unleavened|first\s*fruits|weeks|pentecost|trumpets|atonement|tabernacles|booths|last\s*great\s*day/i.test(
    eventText(e)
  );

/** Extract user-facing feast labels present in an event */
export const extractFeastLabels = (e) => {
  const labels = new Set();
  const hay = eventText(e);
  if (/passover/i.test(hay)) labels.add("Passover");
  if (/unleavened/i.test(hay)) labels.add("Unleavened Bread");
  if (/first\s*fruits/i.test(hay)) labels.add("First Fruits");
  if (/\bweeks\b|pentecost/i.test(hay)) labels.add("Weeks / Pentecost");
  if (/trumpets/i.test(hay)) labels.add("Trumpets");
  if (/atonement/i.test(hay)) labels.add("Atonement");
  if (/tabernacles|booths/i.test(hay)) labels.add("Tabernacles");
  if (/last\s*great\s*day/i.test(hay)) labels.add("Last Great Day");
  return [...labels];
};

/** Convert various ISO-ish inputs to YYYY-MM-DD (UTC) */
export const toYmd = (isoLike) => {
  if (!isoLike) return null;
  try {
    return dayjs.utc(isoLike).format("YYYY-MM-DD");
  } catch {
    return null;
  }
};

/** Group normalized events by dateYmd */
export const groupByDay = (items = []) => {
  return (items || []).reduce((acc, e) => {
    const key = e?.dateYmd ?? toYmd(e?.dateISO) ?? toYmd(e?.date) ?? toYmd(e?.startDateISO);
    if (!key) return acc;
    (acc[key] ||= []).push(e);
    return acc;
  }, {});
};

/** Compute explanation lines for a visible month from a byDay map */
export const computeExplanationItems = (byDay, selectedMonth) => {
  const items = [];
  const monthPrefix = selectedMonth.format("YYYY-MM");
  Object.entries(byDay).forEach(([ymd, list]) => {
    if (!ymd.startsWith(monthPrefix)) return;
    const labelDate = dayjs.utc(ymd).format("MMM D");
    const labels = [];
    if (list.some(isSabbath)) labels.push("Sabbath");
    const feastSet = new Set(list.flatMap(extractFeastLabels));
    feastSet.forEach((l) => labels.push(l));
    if (labels.length) items.push(`${labelDate}: ${labels.join(", ")}`);
  });
  return items;
};

/** Utility to build a month range in YYYY-MM-DD (UTC) */
export const getMonthRange = (year, monthZeroIndexed) => {
  const from = dayjs.utc({ year, month: monthZeroIndexed, date: 1 }).format("YYYY-MM-01");
  const to = dayjs
    .utc({ year, month: monthZeroIndexed, date: 1 })
    .add(1, "month")
    .format("YYYY-MM-01");
  return { from, to };
};

/** Tailwind-aware class builder for a calendar cell */
export const composeCellClass = ({ hasSabbath, hasFeast, isCurrentMonth }) => {
  const base = "border p-2 min-h-[90px] flex flex-col bg-white";
  const sabbathCls = hasSabbath ? " ring-2 ring-purple-500 ring-offset-1 ring-offset-gray-300 bg-purple-50" : "";
  const feastCls = hasFeast ? " ring-2 ring-emerald-600 ring-offset-1 ring-offset-gray-300 bg-emerald-50" : "";
  const outsideCls = isCurrentMonth ? "" : " opacity-40";
  return `${base}${sabbathCls}${feastCls}${outsideCls}`;
};
