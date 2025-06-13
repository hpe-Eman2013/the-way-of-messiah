import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";

export default function TestimoniesPage() {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTestimonies = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/testimonies`
        );
        setTestimonies(response.data);
      } catch (err) {
        setError("Failed to load testimonies.");
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonies();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Testimonies</h1>
        {loading && <p className="text-center">Loading...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {testimonies.length === 0 && !loading && (
          <p className="text-center text-gray-600">
            No testimonies to display.
          </p>
        )}

        <div className="space-y-6">
          {testimonies.map(({ _id, name, message, imageUrl, createdAt }) => (
            <div
              key={_id}
              className="bg-white p-6 rounded-lg shadow border border-gray-200"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-gray-800">{name}</h2>
                {createdAt && (
                  <span className="text-sm text-gray-500">
                    {new Date(createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-line">{message}</p>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={`${name}'s testimony`}
                  className="mt-4 max-h-60 object-contain rounded border"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
