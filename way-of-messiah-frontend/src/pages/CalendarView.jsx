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
        setSpringEquinox(null);
      }
    };

    const fetchData = async () => {
      try {
        const [eventsRes, explanationsRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/events`),
          axios.get(`${BASE_URL}/api/explanations`)
        ]);
        setEvents(eventsRes.data || []);
        setExplanations(explanationsRes.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setEvents([]);
        setExplanations([]);
      }
    };

    fetchEquinox();
    fetchData();
  }, [BASE_URL, selectedMonth]);
 
  // Helpers
  // Compare in UTC to avoid TZ shifting a day earlier
  const getEventsByDate = (dateLocal) => {
    const dateUTC = dayjs.utc(dateLocal.format("YYYY-MM-DD"));
    return events.filter((e) => dayjs.utc(e.date).isSame(dateUTC, "day"));
  };

  const isFeast = (text) =>
    /feast|passover|atonement|tabernacles|shavuot|unleavened|trumpets/i.test(text);

  const isFeastEvent = (e) => {
    const check = (val) => typeof val === "string" && isFeast(val.toLowerCase());
    if (Array.isArray(e.description)) return e.description.some(check);
    return check(e.name) || check(e.description);
  };

  const isSabbathEvent = (e) => {
    const check = (val) => typeof val === "string" && val.toLowerCase().includes("sabbath");
    if (Array.isArray(e.description)) return e.description.some(check);
    return check(e.description);
  };

  const getFeastExplanations = () => {
    const feastEvents = events.filter(
      (e) => dayjs.utc(e.date).isSame(dayjs.utc(selectedMonth.format("YYYY-MM-01")), "month") && isFeastEvent(e)
    );
    const sabbathEvents = events.filter(
      (e) => dayjs.utc(e.date).isSame(dayjs.utc(selectedMonth.format("YYYY-MM-01")), "month") && isSabbathEvent(e)
    );

    if (feastEvents.length === 0 && sabbathEvents.length > 0) {
      const sabbathInfo = explanations.find((x) => x.name?.toLowerCase() === "sabbath");
      if (!sabbathInfo) return <p>No explanation found for Sabbath.</p>;

      return (
        <div className="space-y-1">
          <p><strong>Purpose:</strong> {sabbathInfo.purpose || "—"}</p>
          {Array.isArray(sabbathInfo.restrictions) && sabbathInfo.restrictions.length > 0 && (
            <>
              <p><strong>Restrictions:</strong></p>
              <ul className="list-disc pl-5">
                {sabbathInfo.restrictions.map((r, idx) => <li key={idx}>{r}</li>)}
              </ul>
            </>
          )}
          {sabbathInfo.length && (<p><strong>Length:</strong> {sabbathInfo.length}</p>)}
          {sabbathInfo.whenObserved && (<p><strong>When Observed:</strong> {sabbathInfo.whenObserved}</p>)}
          {sabbathInfo.whoItWasBindingOn && (<p><strong>Who it was binding on:</strong> {sabbathInfo.whoItWasBindingOn}</p>)}
          {sabbathInfo.customs && (<p><strong>Customs:</strong> {sabbathInfo.customs}</p>)}
        </div>
      );
    }

    if (feastEvents.length === 0) return null;

    // De-dupe feasts (e.g., Unleavened Bread spans multiple days)
    const uniqueFeasts = new Map();

    feastEvents.forEach((e) => {
      const feastTag = Array.isArray(e.description)
        ? e.description.find((d) => isFeast(d))
        : isFeast(e.description) ? e.description : null;

      const normalizedTag = feastTag?.replace(/\s+(Start|End)$/i, "").toLowerCase();

      if (normalizedTag && !uniqueFeasts.has(normalizedTag)) {
        uniqueFeasts.set(normalizedTag, {
          feastTag,
          date: e.date,
          info: explanations.find((x) => x.name.toLowerCase() === normalizedTag)
        });
      }
    });

    return Array.from(uniqueFeasts.values()).map(({ feastTag, date, info }) => (
      <div key={feastTag} className="mb-3">
        <p className="font-bold">{dayjs.utc(date).local().format("YYYY-MM-DD")}: {feastTag}</p>
          <p><strong>Purpose:</strong> {info?.purpose || "—"}</p>
        {info?.length && (<p><strong>Length:</strong> {info.length}</p>)}
        {Array.isArray(info?.restrictions) && info.restrictions.length > 0 && (
          <>
            <p><strong>Restrictions:</strong></p>
            <ul className="list-disc pl-5">
              {info.restrictions.map((r, idx) => <li key={idx}>{r}</li>)}
            </ul>
          </>
        )}
        {info?.whenObserved && (<p><strong>When Observed:</strong> {info.whenObserved}</p>)}
        {info?.whoItWasBindingOn && (<p><strong>Who it was binding on:</strong> {info.whoItWasBindingOn}</p>)}
        {info?.customs && (<p><strong>Customs:</strong> {info.customs}</p>)}
        </div>
    ));
  };

  const renderCells = (month) => {
    const cells = [];
    const startDay = month.startOf("month").day(); // 0=Sun
    const daysInMonth = month.daysInMonth();
    const totalCells = startDay + daysInMonth > 35 ? 42 : 35;

    for (let i = 0; i < totalCells; i++) {
    const currentDateLocal = month.startOf("month").add(i - startDay, "day");
    const isCurrentMonth = currentDateLocal.month() === month.month();

    // Use UTC for logic; local only for labels
    const currentDateUTC = dayjs.utc(currentDateLocal.format("YYYY-MM-DD"));

    const todayEvents = isCurrentMonth ? getEventsByDate(currentDateLocal) : [];

    const calculateEnochDay = (dateUTC) => {
        const lastEnochDay = events.find((e) => e.name === "Day 364");
        const fallbackEquinox = (() => {
          const year = selectedMonth.year();
        const beforeMarch20 = dateUTC.isBefore(dayjs.utc(`${year}-03-20`));
          if (beforeMarch20 && lastEnochDay) {
          return dayjs.utc(lastEnochDay.date).add(1, "day");
          }
        return dayjs.utc(`${year - 1}-03-20`);
        })();

      const actualEquinox = springEquinox ? dayjs.utc(springEquinox) : fallbackEquinox;
        const firstCycleStart = actualEquinox.add(1, "day"); // Day 1 = day after equinox
      if (dateUTC.isBefore(firstCycleStart)) return null;

      const daysSinceFirst = dateUTC.diff(firstCycleStart, "day");
        const currentCycleStart = firstCycleStart.add(Math.floor(daysSinceFirst / 364) * 364, "day");
      const enochDay = dateUTC.diff(currentCycleStart, "day") + 1;
        return enochDay > 364 ? null : enochDay;
      };

    const enochDay = calculateEnochDay(currentDateUTC);

      const classNames = [];
      if (todayEvents.some((e) => isSabbathEvent(e))) classNames.push("sabbath");
      if (todayEvents.some((e) => isFeastEvent(e))) classNames.push("feast");

      cells.push(
        <div key={i} className={`day ${classNames.join(" ")}`}>
          {isCurrentMonth && (
            <>
            {/* Local for visual label */}
            <div className="font-bold text-sm">{currentDateLocal.format("MMM D")}</div>
              {enochDay && <div className="text-xs font-bold">Day {enochDay}</div>}
              {todayEvents.map((event) => {
                const isDayLabel = /^Day\s\d{1,3}$/i.test(event.name);
                return !isDayLabel ? (
                  <div key={event._id} className="text-xs mt-1">
                  <strong>
                    {Array.isArray(event.description) && event.description.length > 0
                      ? event.description.join(", ")
                      : event.name}
                    </strong>
                  </div>
                ) : null;
              })}
            </>
          )}
        </div>
      );
    }
    return cells;
  };


  // Paging controls
  const goToPreviousMonth = () => {
    setSelectedMonth((prev) => prev.subtract(1, "month"));
  };

  const goToNextMonth = () => {
    setSelectedMonth((prev) => prev.add(1, "month"));
  };

  // Download ZIP
  const handleDownloadCalendar = async () => {
    try {
      setDownloading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/calendar/download`);
      if (!response.ok) throw new Error("Failed to download calendar");

      const blob = await response.blob();

      let filename = "calendar.zip";
      const disposition = response.headers.get("Content-Disposition");
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/["']+/g, "");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
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
          {downloading ? "Downloading..." : "Download Calendar (.zip)"}
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
