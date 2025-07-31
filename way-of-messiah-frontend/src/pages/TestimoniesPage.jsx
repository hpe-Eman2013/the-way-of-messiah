// TestimoniesPage.jsx (defensive .map and debug added)

import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";

export default function TestimoniesPage() {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const BASE_URL = import.meta.env.VITE_API_URL;
  
  useEffect(() => {
    const fetchTestimonies = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/testimonies?approved=true`);
        console.log("Testimonies response:", response.data);

        if (Array.isArray(response.data)) {
        setTestimonies(response.data);
        } else {
          console.error("Unexpected format:", response.data);
          setTestimonies([]);
        }
      } catch (err) {
        console.error("Error fetching testimonies:", err);
        setError("Failed to load testimonies.");
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonies();
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Testimonies</h1>

        {loading && <p className="text-center">Loading...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!loading && Array.isArray(testimonies) && testimonies.length === 0 && (
          <p className="text-center text-gray-600">No testimonies to display.</p>
        )}

        <div className="space-y-6">
          {Array.isArray(testimonies) ? (
            testimonies.map(({ _id, name, message, imageUrl, createdAt }) => (
              <div
                key={_id}
                className="bg-gray-100 p-6 rounded-lg shadow border border-gray-300"
              >
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {name || "Anonymous"}
                  </h2>
                  {createdAt && (
                    <span className="text-sm text-gray-600">
                      {new Date(createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
            <p className="text-gray-800 whitespace-pre-line">{message}</p>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={`${name}'s testimony`}
                    className="mt-4 max-h-60 object-contain rounded border"
                  />
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-600">Unable to load testimonies.</p>
          )}
        </div>
      </div>
    </div>
  );
}
