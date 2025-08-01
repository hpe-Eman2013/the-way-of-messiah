import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
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

  const daysInMonth = selectedMonth.daysInMonth();
  const startDay = selectedMonth.startOf("month").day();
  const totalCells = 35;

  const isFeast = (name) =>
    /feast|passover|atonement|tabernacles|shavuot/i.test(name);

  const getEventsByDate = (date) =>
    events.filter((e) => dayjs(e.date).isSame(date, "day"));

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
      <h1 className="text-2xl font-bold text-center mb-6">
        {selectedMonth.format("MMMM YYYY")} - Enoch Calendar
      </h1>

      <div className="grid grid-cols-7 text-center font-semibold mb-2">
        {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((d) => (
          <div key={d} className="bg-gray-200 py-2 text-sm">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border border-gray-300">
        {renderCells()}
      </div>

      <div className="mt-6 max-w-4xl mx-auto">
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          Download Calendar (.zip)
        </button>
      </div>
    </div>
  );
};

export default CalendarView;
