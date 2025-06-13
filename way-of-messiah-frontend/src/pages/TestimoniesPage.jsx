import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";

export default function Testimonies() {
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
        <h1 className="text-3xl font-bold mb-4 text-center">Testimonies</h1>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {testimonies.map(({ _id, name, message, imageUrl }) => (
          <div key={_id} className="bg-white p-4 rounded shadow mb-4">
            <h2 className="text-xl font-semibold">{name}</h2>
            <p className="mt-2">{message}</p>
            {imageUrl && (
              <img
                src={imageUrl}
                alt={`${name}'s testimony`}
                className="mt-4 max-h-60 object-contain"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
