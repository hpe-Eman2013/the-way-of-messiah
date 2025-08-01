import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import Header from "../components/Header";
import "../assets/css/EventsPage.css";

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Upcoming Events & Gatherings
        </h1>

        {loading && <p>Loading events...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <div className="space-y-6">
          {events.map((event) => (
            <div key={event._id} className="bg-white shadow-md rounded p-4 border border-gray-200">
              <h2 className="text-xl font-semibold">{event.name}</h2>
              <p className="text-gray-600">
                📅 {dayjs(event.date).format("MMMM D, YYYY")} @ {event.time}
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
    </div>
  );
};

export default EventsPage;