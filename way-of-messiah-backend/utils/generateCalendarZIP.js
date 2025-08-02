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
 * Generates a ZIP file containing monthly HTML calendar pages.
 * @param {Array} events - Array of calendar events from DB
 * @param {dayjs.Dayjs} enochStart - Start of the 364-day cycle
 * @returns {Promise<{ filename: string, buffer: Buffer }>} ZIP file info
 */
async function generateCalendarZIP(events, enochStart) {
  if (!events || events.length === 0) throw new Error("No events found");

  const zip = new JSZip();
  let current = enochStart.startOf("month");
  const end = enochStart.add(364, "day").endOf("month");

  const htmlTemplatePath = path.join(__dirname, "..", "public", "calendar-template.html");
  const templateContent = await fs.readFile(htmlTemplatePath, "utf-8");

  const files = [];
  while (current.isBefore(end)) {
    const startOfMonth = current.startOf("month");
    const endOfMonth = current.endOf("month");
    const month = current.month();
    const year = current.year();

    // Find all events within this month
    const monthEvents = events.filter(e => {
      const date = dayjs(e.date);
      return date.isSameOrAfter(startOfMonth) && date.isSameOrBefore(endOfMonth);
    });

    // Determine prev and next links
    const prev = current.subtract(1, "month").isSameOrAfter(enochStart)
      ? `calendar-${current.subtract(1, "month").format("MM-YYYY")}.html`
      : "";
    const next = current.add(1, "month").isSameOrBefore(end)
      ? `calendar-${current.add(1, "month").format("MM-YYYY")}.html`
      : "";

    // Generate day cells (35 or 42 cells)
    const firstDay = startOfMonth.startOf("week");
    const totalCells = (startOfMonth.day() + current.daysInMonth() > 35) ? 42 : 35;
    let dayCells = "";
    for (let i = 0; i < totalCells; i++) {
      const gridDate = firstDay.add(i, "day");
      const inCurrentMonth = gridDate.month() === current.month();
      const classList = ["day"];
      let content = "";

      if (inCurrentMonth) {
        content += `${gridDate.format("MMM D")}`;
        let match = monthEvents.find(e => dayjs(e.date).isSame(gridDate, 'day'));
      if (match) {
          content += `<br>Day ${match.enochDay ?? ''}`;
          content += match.name === "Sabbath"
            ? `<br><strong>Sabbath</strong>`
            : `<br>${match.name}`;
          if (match.name === "Sabbath") classList.push("sabbath");
      } else if (gridDate.isSameOrAfter(enochStart) && gridDate.isBefore(end)) {
        const enochDay = gridDate.diff(enochStart, 'day') + 1;
        content += `<br>Day ${enochDay}`;
      }
      }

      if (!inCurrentMonth) classList.push("empty");
      dayCells += `<div class="${classList.join(" ")}">${content}</div>`;
    }

    const populatedHtml = templateContent
      .replace(/{{MONTH}}/g, current.format("MMMM"))
      .replace(/{{YEAR}}/g, current.format("YYYY"))
      .replace("{{DAY_CELLS}}", dayCells)
      .replace("{{PREV_LINK}}", prev ? `<a href=\"${prev}\">← Prev</a>` : "")
      .replace("{{NEXT_LINK}}", next ? `<a href=\"${next}\">Next →</a>` : "");

    const filename = `calendar-${current.format("MM-YYYY")}.html`;
    zip.file(filename, populatedHtml);
    current = current.add(1, "month");
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipFilename = `Enoch-Calendar-${enochStart.format("MM-YYYY")}-${end.format("MM-YYYY")}.zip`;
  return { filename: zipFilename, buffer: zipBuffer };
}

module.exports = generateCalendarZIP;
