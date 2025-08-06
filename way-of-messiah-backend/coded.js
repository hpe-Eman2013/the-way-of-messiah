import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "../assets/css/CalendarView.css";

dayjs.extend(utc);

const CalendarView = () => {
  // State for events and explanations
  const [events, setEvents] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [springEquinox, setSpringEquinox] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs("2025-03-01"));
  const [downloading, setDownloading] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // Fetch events and explanations from backend API
    const fetchData = async () => {
      try {
        const [eventsRes, explanationsRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/events`),
          axios.get(`${BASE_URL}/api/explanations`),
        ]);
        setEvents(eventsRes.data); // Events from MongoDB
        setExplanations(explanationsRes.data); // Explanations from "Yahuah's-Holy-Days"
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    // Fetch spring equinox
    const fetchEquinox = async () => {
      try {
        const year = selectedMonth.year();
        const res = await axios.get(`${BASE_URL}/api/equinox?year=${year}`);
        setSpringEquinox(dayjs.utc(res.data.springEquinox));
      } catch (err) {
        console.error("Error fetching spring equinox:", err);
      }
    };

    fetchData();
    fetchEquinox();
  }, [BASE_URL, selectedMonth]);

  // ...existing helper functions (getEventsByDate, isFeast, isFeastEvent, isSabbathEvent, etc.)...

  // Example: getEventsByDate
  const getEventsByDate = (date) =>
    events.filter((e) => dayjs(e.date).isSame(date, "day"));

  // Example: getFeastExplanations
  const getFeastExplanations = () => {
    const feastEvents = events.filter(
      (e) => dayjs(e.date).isSame(selectedMonth, "month") && isFeastEvent(e)
    );

    const sabbathEvents = events.filter(
      (e) => dayjs(e.date).isSame(selectedMonth, "month") && isSabbathEvent(e)
    );

    if (feastEvents.length === 0 && sabbathEvents.length > 0) {
      const sabbathInfo = explanations.find(
        (e) => e.name?.toLowerCase().includes("sabbath")
      );
      if (!sabbathInfo) return <p>No explanation found for Sabbath.</p>;

      return (
        <ul className="list-disc pl-5 space-y-1">
          {sabbathInfo.restrictions.map((r, idx) => (
            <li key={idx}><strong>{r}</strong></li>
          ))}
        </ul>
      );
    }

    if (feastEvents.length === 0) return null;

    return feastEvents.map((e) => {
      const feastTag = Array.isArray(e.description)
        ? e.description.find(d => isFeast(d))
        : isFeast(e.description) ? e.description : null;

      const info = explanations.find(
        (x) => feastTag && x.name.toLowerCase() === feastTag.toLowerCase()
      );
      return (
        <div key={e._id} className="mb-3">
          <p className="font-bold">{dayjs(e.date).format("YYYY-MM-DD")}: {e.name}</p>
          <p><strong>Purpose:</strong> {info?.purpose || "—"}</p>
          {info?.restrictions?.length > 0 && (
            <>
              <p><strong>Restrictions:</strong></p>
              <ul className="list-disc pl-5">
                {info.restrictions.map((r, idx) => <li key={idx}>{r}</li>)}
              </ul>
            </>
          )}
          {info?.customs && (
            <p><strong>Customs:</strong> {info.customs}</p>
          )}
        </div>
      );
    });
  };

  // ...existing renderCells, navigation, and download logic...

  return (
    <div className="min-h-screen bg-gray-100 text-black p-4">
      <h1 className="calendar-view-title text-2xl font-bold">
        CONSECRATED DAYS OF YAHUAH
      </h1>
      <h2 className="calendar-view-title text-xl font-semibold mb-2">
        {selectedMonth.format("MMMM YYYY")} - Enoch 364 Day Calendar
      </h2>

      {/* Navigation and download buttons */}
      {/* ...existing code... */}

      {/* Calendar grid */}
      <div className="calendar-header">
        {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="calendar-grid">{renderCells(selectedMonth)}</div>

      {/* Explanations section */}
      <div className="notes max-w-4xl mx-auto mt-4 bg-white p-4 border border-gray-300">
        <h3 className="text-lg font-semibold mb-2 text-center">Explanations for Set-Apart Days</h3>
        {getFeastExplanations()}
      </div>
    </div>
  );
};

export default CalendarView;