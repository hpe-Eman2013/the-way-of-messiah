// Partial structure ready for full PDF generation logic
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "../assets/css/CalendarView.css";

dayjs.extend(utc);

const SPRING_EQUINOX = dayjs("2025-03-20");

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs("2025-03-01"));
  const BASE_URL = import.meta.env.VITE_API_URL;

  const pdfRef = useRef();

  useEffect(() => {
    const fetchEvents = async () => {
      const res = await axios.get(`${BASE_URL}/api/events`);
      setEvents(res.data);
    };
    fetchEvents();
  }, [BASE_URL]);

  const generateCalendarPDF = async () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1200, 850] });
    const start = dayjs("2025-03-01");
    const end = dayjs("2026-03-31");
    let current = start;

    for (let i = 0; i < 13; i++) {
      setSelectedMonth(current);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const input = pdfRef.current;
      const canvas = await html2canvas(input);
      const imgData = canvas.toDataURL("image/png");

      if (i !== 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, 1200, 850);

      current = current.add(1, "month");
    }
    pdf.save("Enoch_Calendar_2025-2026.pdf");
  };

  return (
    <div>
      <div style={{ display: "none" }}>
        <div ref={pdfRef} className="hidden-pdf-capture">
          {/* Render the calendar layout for PDF capture here */}
      </div>
      </div>

      <button onClick={generateCalendarPDF} className="bg-green-600 text-white px-4 py-2 rounded">
        Download PDF
      </button>
    </div>
  );
};

export default CalendarView;
