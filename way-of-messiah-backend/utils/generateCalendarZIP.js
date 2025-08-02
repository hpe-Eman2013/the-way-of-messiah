// backend/utils/generateCalendarZIP.js

const JSZip = require("jszip");
const { jsPDF } = require("jspdf");
const dayjs = require("dayjs");

/**
 * @param {Array} events - Array of calendar events from DB
 * @param {dayjs.Dayjs} enochStart - Start of the 364-day cycle
 */
async function generateCalendarZIP(events, enochStart) {
  if (!events || events.length === 0) throw new Error("No events found");

  const zip = new JSZip();
  let current = enochStart.startOf("month");

  for (let i = 0; i < 13; i++) {
    const startOfMonth = current.startOf("month");
    const endOfMonth = current.endOf("month");

    const monthEvents = events.filter(e => {
      const date = dayjs(e.date);
      return date.isSameOrAfter(startOfMonth) && date.isSameOrBefore(endOfMonth);
    });

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    pdf.setFontSize(14);
    pdf.text(`Consecrated Days of Yahuah - ${current.format("MMMM YYYY")}`, 40, 40);

    let y = 80;
    monthEvents.forEach(event => {
      const formatted = `${dayjs(event.date).format("MMM D, YYYY")} - ${event.name}`;
      pdf.text(formatted, 40, y);
      y += 20;
    });

    const pdfBlob = pdf.output("arraybuffer");
    const filename = `calendar-${current.format("MM-YYYY")}.pdf`;
    zip.file(filename, pdfBlob);
    current = current.add(1, "month");
  }

  return await zip.generateAsync({ type: "nodebuffer" });
}

module.exports = generateCalendarZIP;
