import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "../assets/css/CalendarView.css";

dayjs.extend(utc);

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(dayjs("2025-03-01"));
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchEvents = async () => {
      const res = await axios.get(`${BASE_URL}/api/events`);
      setEvents(res.data);
    };
    fetchEvents();
  }, [BASE_URL]);

  const startDay = selectedMonth.startOf("month").day();
  const daysInMonth = selectedMonth.daysInMonth();
  const totalCells = startDay + daysInMonth > 35 ? 42 : 35;

  const isFeast = (name) =>
    /feast|passover|atonement|tabernacles|shavuot/i.test(name);

  const getEventsByDate = (date) =>
    events.filter((e) => dayjs(e.date).isSame(date, "day"));

  const getFeastExplanations = () => {
    const feastEvents = events.filter(
      (e) =>
        dayjs(e.date).isSame(selectedMonth, "month") &&
        isFeast(e.name)
    );

    if (feastEvents.length === 0) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>No work</strong> – Exodus 20:10; Leviticus 23:3</li>
          <li><strong>No kindling fire</strong> – Exodus 35:3</li>
          <li><strong>No cooking/baking</strong> – Exodus 16:23</li>
          <li><strong>No gathering food</strong> – Exodus 16:25-26</li>
          <li><strong>No travel beyond limits</strong> – Exodus 16:29</li>
          <li><strong>No burden-carrying</strong> – Jeremiah 17:21-22; Nehemiah 13:15-19</li>
          <li><strong>No buying or selling</strong> – Nehemiah 10:31; 13:16-18</li>
          <li><strong>No business or trading</strong> – Amos 8:5</li>
          <li><strong>No fieldwork</strong> – Exodus 34:21</li>
          <li><strong>No personal pleasure/seeking</strong> – Isaiah 58:13-14</li>
        </ul>
      );
    }

    return feastEvents.map((e) => (
      <p key={e._id}>
        <strong>{dayjs(e.date).format("YYYY-MM-DD")}: {e.name}</strong><br />
        {e.description}
      </p>
    ));
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const currentDate = selectedMonth.startOf("month").add(i - startDay, "day");
      const isCurrentMonth = currentDate.month() === selectedMonth.month();
      const todayEvents = isCurrentMonth ? getEventsByDate(currentDate) : [];
      const classNames = todayEvents.map((e) =>
        e.name.toLowerCase() === "sabbath"
          ? "sabbath"
          : isFeast(e.name)
          ? "feast"
          : ""
      );

      cells.push(
        <div key={i} className={`day ${classNames.join(" ")}`}>
          {isCurrentMonth && (
            <>
              <div className="font-bold text-sm">{currentDate.format("MMM D")}</div>
              <div className="text-xs text-gray-600">Day {i - startDay + 1}</div>
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

  return (
    <div className="min-h-screen bg-gray-100 text-black p-4">
      <h1 className="text-2xl font-bold text-center mb-2">
        CONSECRATED DAYS OF YAHUAH
      </h1>
      <h2 className="text-xl font-semibold text-center mb-6">
        {selectedMonth.format("MMMM YYYY")} - Enoch 364 Day Calendar
      </h2>

      <div className="calendar-header">
        {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {renderCells()}
      </div>

      <div className="download-button">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          Download Calendar (.zip)
        </button>
      </div>

      <div className="notes max-w-4xl mx-auto mt-6 bg-white p-4 border border-gray-300">
        <h3 className="text-lg font-semibold mb-2">Explanations for Set-Apart Days</h3>
        {getFeastExplanations()}
      </div>
    </div>
  );
};

export default CalendarView;
