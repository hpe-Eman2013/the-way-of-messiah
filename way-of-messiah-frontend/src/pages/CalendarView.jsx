import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "../assets/css/CalendarView.css";

dayjs.extend(utc);

const SPRING_EQUINOX = dayjs("2025-03-20");

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs("2025-03-01"));
  const [downloading, setDownloading] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, explanationsRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/events`),
          axios.get(`${BASE_URL}/api/explanations`),
        ]);
        setEvents(eventsRes.data);
        setExplanations(explanationsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [BASE_URL]);

  const getEventsByDate = (date) =>
    events.filter((e) => dayjs(e.date).isSame(date, "day"));

  const isFeast = (name) =>
    /feast|passover|atonement|tabernacles|shavuot/i.test(name);

  const getFeastExplanations = () => {
    const feastEvents = events.filter(
      (e) =>
        dayjs(e.date).isSame(selectedMonth, "month") && isFeast(e.name)
    );

    const sabbathEvents = events.filter(
      (e) =>
        dayjs(e.date).isSame(selectedMonth, "month") &&
        e.description?.toLowerCase().includes("sabbath")
    );

    if (feastEvents.length === 0 && sabbathEvents.length > 0) {
      const sabbathInfo = explanations.find(
        (e) => e.description?.toLowerCase().includes("sabbath")
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
      const info = explanations.find(
        (x) => x.name.toLowerCase() === e.name.toLowerCase()
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

  const renderCells = (month) => {
    const cells = [];
    const startDay = month.startOf("month").day();
    const daysInMonth = month.daysInMonth();
    const totalCells = startDay + daysInMonth > 35 ? 42 : 35;

    for (let i = 0; i < totalCells; i++) {
      const currentDate = month.startOf("month").add(i - startDay, "day");
      const isCurrentMonth = currentDate.month() === month.month();
      const todayEvents = isCurrentMonth ? getEventsByDate(currentDate) : [];
      const classNames = todayEvents.map((e) =>
        e.name.toLowerCase() === "sabbath"
          ? "sabbath"
          : isFeast(e.name)
          ? "feast"
          : ""
      );
      const calculateEnochDay = (date) => {
        const firstCycleStart = SPRING_EQUINOX.add(1, "day");
        if (date.isBefore(firstCycleStart)) return null;

        const daysSinceFirst = date.diff(firstCycleStart, "day");
        const currentCycleStart = firstCycleStart.add(Math.floor(daysSinceFirst / 364) * 364, "day");
        const enochDay = date.diff(currentCycleStart, "day") + 1;

        return enochDay > 364 ? null : enochDay;
      };

      const enochDay = calculateEnochDay(currentDate);

      cells.push(
        <div key={i} className={`day ${classNames.join(" ")}`}>
          {isCurrentMonth && (
            <>
              <div className="font-bold text-sm">{currentDate.format("MMM D")}</div>
              {enochDay !== null && <div className="text-xs text-gray-600">Day {enochDay}</div>}
              {todayEvents.map((event) => (
                <div key={event._id} className="text-xs mt-1">
                  <strong>{event.name}</strong>
                </div>
              ))}
            </>
          )}
        </div>
      );
    }
    return cells;
  };

  const goToPreviousMonth = () => {
    setSelectedMonth((prev) => prev.subtract(1, "month"));
  };

  const goToNextMonth = () => {
    setSelectedMonth((prev) => prev.add(1, "month"));
  };

  const handleDownloadCalendar = async () => {
    try {
      setDownloading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/calendar/download`);
      if (!response.ok) throw new Error('Failed to download calendar');

      const blob = await response.blob();

      let filename = "calendar.zip";
      const disposition = response.headers.get("Content-Disposition");
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/["']/g, "");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Download failed. Please try again.");
      console.error("Error downloading calendar:", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black p-4">
      <h1 className="calendar-view-title text-2xl font-bold">
        CONSECRATED DAYS OF YAHUAH
      </h1>
      <h2 className="calendar-view-title text-xl font-semibold mb-2">
        {selectedMonth.format("MMMM YYYY")} - Enoch 364 Day Calendar
      </h2>

      <div className="flex justify-center items-center gap-3 mb-4 flex-wrap">
        <button onClick={goToPreviousMonth} className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 rounded">
          ← Prev
        </button>
        <button onClick={goToNextMonth} className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 rounded">
          Next →
        </button>
        <button onClick={handleDownloadCalendar} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2">
          {downloading ? (
            <span className="loader inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : null}
          {downloading ? 'Downloading...' : 'Download Calendar (.zip)'}
        </button>
      </div>

      <div className="calendar-header">
        {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="calendar-grid">{renderCells(selectedMonth)}</div>

      <div className="notes max-w-4xl mx-auto mt-4 bg-white p-4 border border-gray-300">
        <h3 className="text-lg font-semibold mb-2 text-center">Explanations for Set-Apart Days</h3>
        {getFeastExplanations()}
      </div>
    </div>
  );
};

export default CalendarView;
