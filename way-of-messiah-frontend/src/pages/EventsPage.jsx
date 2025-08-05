import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import Header from "../components/Header";
import "../assets/css/EventsPage.css";

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_API_URL;
        const response = await axios.get(`${BASE_URL}/api/events`);
        setEvents(response.data);
      } catch (err) {
        setError("Failed to load events.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    if (filter === "feast")
      return (
        event.name.toLowerCase().includes("feast") ||
        event.name.toLowerCase().includes("passover") ||
        event.name.toLowerCase().includes("atonement") ||
        event.name.toLowerCase().includes("tabernacles") ||
        event.name.toLowerCase().includes("shavuot")
      );
    if (filter === "sabbath") return event.name.toLowerCase() === "sabbath";
    return true;
  });

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const key = dayjs.utc(event.date).local().format("MMMM YYYY");
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
              {groupedEvents[month].map((event) => (
                <div
                  key={event._id}
                  className={`event-card ${
                    event.name.toLowerCase() === "sabbath"
                      ? "sabbath"
                      : /feast|passover|atonement|tabernacles|shavuot/i.test(event.name)
                      ? "feast"
                      : "general"
                  }`}
                >
                  <h2 className="text-xl font-semibold">{event.name}</h2>
                 <p className="text-gray-600">
                  🗓️ {dayjs.utc(event.date).local().format("MMMM D, YYYY")} @ {event.time}
                </p>

                  <p className="text-gray-600">📍 {event.location}</p>
                  <p className="mt-2">{event.description}</p>
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
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsPage;
