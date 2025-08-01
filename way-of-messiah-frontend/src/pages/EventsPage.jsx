import React from "react";
import Header from "../components/Header";
import "../assets/css/EventsPage.css";

const events = [
  {
    id: 1,
    name: "Feast of Trumpets (Yom Teruah)",
    date: "2025-09-25",
    time: "6:30 PM",
    location: "Online + Local Fellowship",
    description: "A day of blowing the shofar and gathering to worship Yahuah.",
    link: "",
  },
  {
    id: 2,
    name: "Weekly Sabbath Gathering",
    date: "2025-08-07",
    time: "06:00 AM",
    location: "Virtual Meeting for Prayer and Fellowship",
    description: "Join us for Scripture reading, prayer, and fellowship every 7th day.",
    link: "",
  },
  {
    id: 3,
    name: "Sukkot (Feast of Tabernacles)",
    date: "2025-10-09",
    time: "All Day",
    location: "Local Campgrounds + Remote Broadcast",
    description: "Come dwell in tents and rejoice before Yahuah for 7 days.",
    link: "https://example.com/rsvp",
  },
];

const EventsPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Upcoming Events & Gatherings</h1>
        <div className="space-y-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white shadow-md rounded p-4 border border-gray-200">
              <h2 className="text-xl font-semibold">{event.name}</h2>
              <p className="text-gray-600">
                📅 {new Date(event.date).toLocaleDateString()} @ {event.time}
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
