// backend/utils/generateCalendarZIP.js

const JSZip = require("jszip");
const fs = require("fs/promises");
const path = require("path");
const dayjs = require("dayjs");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
const isSameOrBefore = require("dayjs/plugin/isSameOrBefore");
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/**
 * Generates a ZIP file containing monthly HTML calendar pages as PDFs.
 * @param {Array} events - Array of calendar events from DB
 * @param {dayjs.Dayjs} enochStart - Start of the 364-day cycle
 * @returns {Promise<Buffer>} ZIP file as buffer
 */
async function generateCalendarZIP(events, enochStart) {
  if (!events || events.length === 0) throw new Error("No events found");

  const zip = new JSZip();
  let current = enochStart.startOf("month");
  const end = enochStart.add(364, "day").endOf("month");

  const htmlTemplatePath = path.join(__dirname, "..", "public", "calendar-template.html");
  const templateContent = await fs.readFile(htmlTemplatePath, "utf-8");

  while (current.isBefore(end)) {
    const startOfMonth = current.startOf("month");
    const endOfMonth = current.endOf("month");

    const monthEvents = events.filter(e => {
      const date = dayjs(e.date);
      return date.isSameOrAfter(startOfMonth) && date.isSameOrBefore(endOfMonth);
    });

    const populatedHtml = templateContent
      .replace(/{{MONTH}}/g, current.format("MMMM"))
      .replace(/{{YEAR}}/g, current.format("YYYY"))
      .replace(/{{EVENTS}}/g, monthEvents.map(ev => `<li>${dayjs(ev.date).format("MMM D, YYYY")} - ${ev.name}</li>`).join("\n"));

    zip.file(`calendar-${current.format("MM-YYYY")}.html`, populatedHtml);

    current = current.add(1, "month");
  }

  return await zip.generateAsync({ type: "nodebuffer" });
}

module.exports = generateCalendarZIP;
