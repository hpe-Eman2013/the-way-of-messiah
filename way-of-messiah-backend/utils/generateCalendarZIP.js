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
 * @param {Object} explanations - Map of holy day explanations by name
 * @returns {Promise<{ filename: string, buffer: Buffer }>} ZIP file info
 */
async function generateCalendarZIP(events, enochStart, explanations = {}) {
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

    const feastNamesInMonth = new Set(
      monthEvents.filter(e => e.name !== "Sabbath").map(e => e.name)
    );

    const firstDay = startOfMonth.startOf("week");
    const totalCells = (firstDay.day() + current.daysInMonth() > 35) ? 42 : 35;

    let dayCells = "";

    for (let i = 0; i < totalCells; i++) {
      const gridDate = firstDay.add(i, "day");
      const inCurrentMonth = gridDate.month() === current.month();
      const classList = ["day"];
      let content = "";

      if (inCurrentMonth) {
        content += `${gridDate.format("MMM D")}`;

        if (gridDate.isSameOrAfter(enochStart) && gridDate.isSameOrBefore(end)) {
        const enochDay = gridDate.diff(enochStart, 'day') + 1;
          content += `<br>Day ${enochDay}`;

          const isSabbath = ((enochDay - 7) % 7 === 0);
        const match = monthEvents.find(e => dayjs(e.date).isSame(gridDate, 'day'));
        const isFeast = match && match.name.startsWith("Day") && match.description !== "Sabbath";


          if (match?.description === "Sabbath") {
            content += `<br><strong>Sabbath</strong>`;
            classList.push("sabbath");
          }

          if (isFeast) {
            content += `<br><strong>${match.name}</strong>`;
            classList.push("feast");
          }
      }
      }

      if (!inCurrentMonth) classList.push("empty");
      dayCells += `<div class="${classList.join(" ")}">${content}</div>`;
    }

    let explanationHTML = "";

      feastNamesInMonth.forEach(name => {
        const ex = explanations[name];
        if (ex) {
          explanationHTML += `<h3>${name}</h3><ul>`;
          for (const [label, text] of Object.entries(ex)) {
            explanationHTML += `<li><strong>${label}</strong>: ${text}</li>`;
          }
          explanationHTML += `</ul>`;
        }
      });

    if (explanations.Sabbath) {
      const sabbath = explanations.Sabbath;
      explanationHTML += `<h3>Sabbath</h3><ul>`;
      for (const [label, text] of Object.entries(sabbath)) {
        explanationHTML += `<li><strong>${label}</strong>: ${text}</li>`;
      }
      explanationHTML += `</ul>`;
    }

    const populatedHtml = templateContent
      .replace(/{{MONTH}}/g, current.format("MMMM"))
      .replace(/{{YEAR}}/g, current.format("YYYY"))
      .replace("{{DAY_CELLS}}", dayCells)
      .replace("{{EXPLANATION}}", explanationHTML);

    const filename = `${current.format("YYYY-MM-DD")}_calendar.html`;
    zip.file(filename, populatedHtml);
    current = current.add(1, "month");
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipFilename = `Enoch-Calendar-${enochStart.format("MM-YYYY")}_to_${end.format("MM-YYYY")}.zip`;
  return { filename: zipFilename, buffer: zipBuffer };
}

module.exports = generateCalendarZIP;
