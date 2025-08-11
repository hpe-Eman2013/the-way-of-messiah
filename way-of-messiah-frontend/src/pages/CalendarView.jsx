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
  }, [BASE_URL, selectedMonth]);
 
  const getEventsByDate = (date) => events.filter((e) => dayjs(e.date).isSame(date, "day"));
  const isFeast = (text) => /feast|passover|atonement|tabernacles|shavuot|unleavened|trumpets/i.test(text);
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
    const feastEvents = events.filter((e) => dayjs(e.date).isSame(selectedMonth, "month") && isFeastEvent(e));
    const sabbathEvents = events.filter((e) => dayjs(e.date).isSame(selectedMonth, "month") && isSabbathEvent(e));
    if (feastEvents.length === 0 && sabbathEvents.length > 0) {
      const sabbathInfo = explanations.find((e) => e.name?.toLowerCase() === "sabbath");
      if (!sabbathInfo) return <p>No explanation found for Sabbath.</p>;
      return (
        <div>
          <p><strong>Purpose:</strong> {sabbathInfo.purpose}</p>
          <p><strong>Length:</strong> {sabbathInfo.length}</p>
          <p><strong>Restrictions:</strong> {sabbathInfo.restrictions.join(", ")}</p>
          <p><strong>When Observed:</strong> {sabbathInfo.whenObserved}</p>
          <p><strong>Who it was binding on:</strong> {sabbathInfo.whoItWasBindingOn}</p>
          <p><strong>Customs:</strong> {sabbathInfo.customs}</p>
        </div>
      );
    }
    if (feastEvents.length === 0) return null;
    const uniqueFeasts = new Map();
    feastEvents.forEach((e) => {
      const feastTag = Array.isArray(e.description) ? e.description.find(d => isFeast(d)) : isFeast(e.description) ? e.description : null;
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
        <p className="font-bold">{dayjs(date).format("YYYY-MM-DD")}: {feastTag}</p>
          <p><strong>Purpose:</strong> {info?.purpose || "—"}</p>
        <p><strong>Length:</strong> {info?.length || "—"}</p>
        <p><strong>Restrictions:</strong> {info?.restrictions?.join(", ") || "—"}</p>
        <p><strong>When Observed:</strong> {info?.whenObserved || "—"}</p>
        <p><strong>Who it was binding on:</strong> {info?.whoItWasBindingOn || "—"}</p>
        <p><strong>Customs:</strong> {info?.customs || "—"}</p>
        </div>
    ));
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
      const classNames = todayEvents.map((e) => isSabbathEvent(e) ? "sabbath" : isFeastEvent(e) ? "feast" : "");
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
        const actualEquinox = springEquinox ? dayjs(springEquinox).add(1, "day") : fallbackEquinox.add(1, "day");
        const firstCycleStart = actualEquinox;
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
              {enochDay && <div className="text-xs font-bold">Day {enochDay}</div>}
              {todayEvents.map((event) => {
                const isDayLabel = /^Day\s\d{1,3}$/i.test(event.name);
                return !isDayLabel ? (
                  <div key={event._id} className="text-xs mt-1">
                    <strong>{event.name}</strong>
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

  return (
    <div className="min-h-screen bg-gray-100 text-black p-4">
      <h1 className="calendar-view-title text-2xl font-bold">CONSECRATED DAYS OF YAHUAH</h1>
      <h2 className="calendar-view-title text-xl font-semibold mb-2">{selectedMonth.format("MMMM YYYY")} - Enoch 364 Day Calendar</h2>
      <div className="calendar-header">{"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (<div key={d}>{d}</div>))}</div>
      <div className="calendar-grid">{renderCells(selectedMonth)}</div>
      <div className="notes max-w-4xl mx-auto mt-4 bg-white p-4 border border-gray-300">
        <h3 className="text-lg font-semibold mb-2 text-center">Explanations for Set-Apart Days</h3>
        {getFeastExplanations()}
      </div>
    </div>
  );
};

export default CalendarView;
