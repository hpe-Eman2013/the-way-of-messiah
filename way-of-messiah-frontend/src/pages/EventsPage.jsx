// src/pages/EventsPage.jsx — updated to work with /api/events and new schema
// - Uses `api` axios instance (JWT interceptor already set up)
// - Expects backend GET /api/events to return { items, total, ... }
// - Fields: title, category, startDate, endDate, time, location, description, link

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { api } from "../lib/api"; // <-- shared axios instance

import Header from "../components/Header";
import "../assets/css/EventsPage.css";

dayjs.extend(utc);

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all | feast | sabbath

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        // ask for published only; backend may ignore this param, which is fine
        const { data } = await api.get("/events", { params: { limit: 500, published: 1 } });
        // support either { items: [...] } or legacy [ ... ]
        setEvents(Array.isArray(data) ? data : (data.items || []));
      } catch (err) {
        setError("Failed to load events.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Filter by simple categories (keep your existing buttons)
  const filteredEvents = events.filter((event) => {
    const title = (event.title || event.name || "").toLowerCase();
    const category = (event.category || "").toLowerCase();
    if (filter === "feast") {
      return (
        category === "feast" ||
        /feast|passover|atonement|tabernacles|shavuot/.test(title)
      );
    }
    if (filter === "sabbath") {
      return category === "sabbath" || title === "sabbath";
    }
    return true;
  });

  // Group by calendar month (use new startDate; fallback to legacy date)
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const start = event.startDate || event.date; // legacy support
    const key = dayjs.utc(start).local().format("MMMM YYYY");
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Upcoming Events & Gatherings
        </h1>

        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("feast")}
            className={`px-4 py-2 rounded ${
              filter === "feast"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            Feasts
          </button>
          <button
            onClick={() => setFilter("sabbath")}
            className={`px-4 py-2 rounded ${
              filter === "sabbath"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            Sabbaths
          </button>
          <Link to="/events/list">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
              List View
            </button>
          </Link>
          <Link to="/calendar-view">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded">
              Calendar View
            </button>
          </Link>
        </div>

        {loading && <p>Loading events...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {Object.keys(groupedEvents).map((month) => (
          <div key={month} className="mb-10">
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-1">
              🗓️ {month}
            </h2>
            <div className="space-y-6">
              {groupedEvents[month]
                // sort inside the month by start time
                .sort((a,b)=> dayjs(a.startDate || a.date).valueOf() - dayjs(b.startDate || b.date).valueOf())
                .map((event) => {
                  const start = event.startDate || event.date; // legacy support
                  const isFeast = (event.category === "Feast") || /feast|passover|atonement|tabernacles|shavuot/i.test(event.title || event.name || "");
                  const isSabbath = (event.category === "Sabbath") || /\bSabbath\b/i.test(event.title || event.name || "");
                  const cardClass = isSabbath ? "sabbath" : (isFeast ? "feast" : "general");
                  return (
                    <div key={event._id} className={`event-card ${cardClass}`}>
                      <h2 className="text-xl font-semibold">{event.title || event.name}</h2>
                 <p className="text-gray-600">
                        🗓️ {dayjs.utc(start).local().format("MMMM D, YYYY h:mm A")}
                        {event.endDate && ` → ${dayjs.utc(event.endDate).local().format("h:mm A")}`}
                        {event.time ? `  ·  ${event.time}` : ""}
                </p>
                      {(event.location || event.city || event.state || event.country) && (
                        <p className="text-gray-600">📍 {[event.location, event.city, event.state, event.country].filter(Boolean).join(", ")}</p>
                      )}
                      {event.description && (
                  <p className="mt-2">{event.description}</p>
                      )}
                  {event.link && (
                    <a
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-blue-600 hover:underline"
                    >
                      🔗 More Info / RSVP
                    </a>
                  )}
                </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsPage;
