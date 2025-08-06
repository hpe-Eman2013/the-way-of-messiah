import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "../assets/css/CalendarView.css";

dayjs.extend(utc);

const CalendarView = () => {
  const [springEquinox, setSpringEquinox] = useState(null);
  const [events, setEvents] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().startOf("month"));
  const [downloading, setDownloading] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchEquinox = async () => {
      try {
        const year = selectedMonth.year();
        const res = await axios.get(`${BASE_URL}/api/equinox?year=${year}`);
        setSpringEquinox(dayjs.utc(res.data.springEquinox));
      } catch (err) {
        console.error("Error fetching spring equinox:", err);
      }
    };

    const fetchData = async () => {
      try {
        const [eventsRes, explanationsRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/events`),
          axios.get(`${BASE_URL}/api/explanations`)
        ]);
        setEvents(eventsRes.data);
        setExplanations(explanationsRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchEquinox();
    fetchData();
  }, [BASE_URL]);
 
  const getEventsByDate = (date) =>
    events.filter((e) => dayjs(e.date).isSame(date, "day"));

  const isFeast = (text) =>
    /feast|passover|atonement|tabernacles|shavuot|unleavened|trumpets/i.test(text);

  const isFeastEvent = (e) => {
    const check = (val) => typeof val === 'string' && isFeast(val.toLowerCase());
    if (Array.isArray(e.description)) return e.description.some(check);
    return check(e.name) || check(e.description);
  };

  const isSabbathEvent = (e) => {
    const check = (val) => typeof val === 'string' && val.toLowerCase().includes("sabbath");
    if (Array.isArray(e.description)) return e.description.some(check);
    return check(e.description);
  };

  const getFeastExplanations = () => {
    const feastEvents = events.filter(
      (e) => dayjs(e.date).isSame(selectedMonth, "month") && isFeastEvent(e)
    );

    const sabbathEvents = events.filter(
      (e) => dayjs(e.date).isSame(selectedMonth, "month") && isSabbathEvent(e)
    );

    if (feastEvents.length === 0 && sabbathEvents.length > 0) {
      const sabbathInfo = explanations.find(
        (e) => {
          if (Array.isArray(e.description)) {
            return e.description.some(d => d.toLowerCase().includes("sabbath"));
          }
          return typeof e.description === 'string' && e.description.toLowerCase().includes("sabbath");
        }
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
          <p className="font-bold">{dayjs(e.date).format("YYYY-MM-DD")}: {feastTag}</p>
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
      const classNames = todayEvents.map((e) => {
        return isSabbathEvent(e) ? "sabbath" : isFeastEvent(e) ? "feast" : "";
      });
      const calculateEnochDay = (date) => {
        const lastEnochDay = events.find(e => e.name === "Day 364");
        const fallbackEquinox = (() => {
          const year = selectedMonth.year();
          const beforeMarch20 = date.isBefore(dayjs(`${year}-03-20`));
          if (beforeMarch20 && lastEnochDay) {
            return dayjs(lastEnochDay.date).add(1, "day");
          }
          return dayjs(`${year - 1}-03-20`);
        })();
        const actualEquinox = springEquinox || fallbackEquinox;
        const firstCycleStart = actualEquinox.add(1, "day");
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
