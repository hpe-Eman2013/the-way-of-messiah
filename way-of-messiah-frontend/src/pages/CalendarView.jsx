import React from "react";

export default function CalendarView() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">Calendar View</h1>

        <iframe
          src="/calendars/March2025.html"
          title="March 2025 Enoch Calendar"
          className="w-full h-[1000px] border rounded shadow"
        ></iframe>

        <div className="text-center mt-4">
          <a
            href="/calendars/March2025.html"
            download
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          >
            Download Calendar
          </a>
        </div>
      </div>
    </div>
  );
}
