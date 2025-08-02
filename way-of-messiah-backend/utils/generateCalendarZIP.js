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
    const month = current.month();
    const year = current.year();

    // Find all events within this month
    const monthEvents = events.filter(e => {
      const date = dayjs(e.date);
      return date.isSameOrAfter(startOfMonth) && date.isSameOrBefore(endOfMonth);
    });

    // Generate day cells (35 cells minimum)
    const daysInGrid = 35 + (startOfMonth.day() + current.daysInMonth() > 35 ? 7 : 0);
    let dayCells = "";
    for (let i = 0; i < daysInGrid; i++) {
      const gridDate = startOfMonth.startOf("week").add(i, "day");
      const greg = gridDate.format("MMM D");
      let content = `${greg}`;
      let extra = "";

      const match = monthEvents.find(e => dayjs(e.date).isSame(gridDate, 'day'));
      if (match) {
        content += `<br>Day ${match.enochDay}`;
        if (match.name === "Sabbath") {
          extra += "<br><strong>Sabbath</strong>";
        } else {
          extra += `<br>${match.name}`;
        }
      } else if (gridDate.isSameOrAfter(enochStart) && gridDate.isBefore(end)) {
        const enochDay = gridDate.diff(enochStart, 'day') + 1;
        content += `<br>Day ${enochDay}`;
      }

      const className = match?.name === "Sabbath" ? "sabbath" : "";
      dayCells += `<div class="day ${className}">${content}${extra}</div>`;
    }

    // Populate template
    const populatedHtml = templateContent
      .replace(/{{MONTH}}/g, current.format("MMMM"))
      .replace(/{{YEAR}}/g, current.format("YYYY"))
      .replace("{{DAY_CELLS}}", dayCells);

    zip.file(`calendar-${current.format("MM-YYYY")}.html`, populatedHtml);
    current = current.add(1, "month");
  }

  return await zip.generateAsync({ type: "nodebuffer" });
}

module.exports = generateCalendarZIP;
