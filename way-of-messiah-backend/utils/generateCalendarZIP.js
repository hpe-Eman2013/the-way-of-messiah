// backend/utils/generateCalendarZIP.js

const JSZip = require("jszip");
const { jsPDF } = require("jspdf");
const dayjs = require("dayjs");
const { getEventsFromDB } = require("../models/CalendarService"); // hypothetical DB call

/**
 * Generates a ZIP file buffer containing PDFs for each month
 * from the astronomical Spring Equinox start (Day 1) until 364 days later.
 */
async function generateCalendarZIP() {
  const zip = new JSZip();
  const { events, enochStart, enochEnd } = await getEventsFromDB();
  if (!events || events.length === 0) throw new Error("No events found");
    
  // Infer start and end from data  
  let current = enochStart.startOf('month');
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
