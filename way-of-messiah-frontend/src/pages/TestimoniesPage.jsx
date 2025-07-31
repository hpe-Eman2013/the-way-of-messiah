// TestimoniesPage.jsx
console.log("🧠 TestimoniesPage is rendering...");
import { useState, useEffect } from "react";
import axios from "axios";

const TestimoniesPage = () => {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTestimonies = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_API_URL;
        const response = await axios.get(`${BASE_URL}/api/testimonies`);
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
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Testimonies</h1>
      {loading && <p>Loading testimonies...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {testimonies.length === 0 && !loading && (
        <p className="text-gray-500">No testimonies to display.</p>
      )}
      <div className="space-y-6">
        {testimonies.map(({ _id, name, message, imageUrl, createdAt }) => {
          const BASE = import.meta.env.VITE_API_URL.replace(/\/$/, "");
          const fullImageUrl = imageUrl?.startsWith("http")
            ? imageUrl
            : `${BASE}${imageUrl}`;
          console.log("imageUrl:", imageUrl);
          console.log("fullImageUrl:", fullImageUrl);
          return (
            <div key={_id} className="bg-white shadow p-4 rounded border">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-lg">{name || "Anonymous"}</h2>
                {createdAt && (
                  <span className="text-sm text-gray-400">
                    {new Date(createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-gray-800 whitespace-pre-line">{message}</p>
              {imageUrl && (
                <img
                  src={imageUrl.startsWith("http") ? imageUrl : `${BASE_URL.replace(/\/$/, "")}${imageUrl}`}
                  alt={`${name}'s testimony`}
                  className="mt-4 max-h-60 object-contain rounded border"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TestimoniesPage;
