// TestimoniesPage.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import "../assets/css/TestimoniesPage.css";
import Header from "../components/Header";

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
  const hasLiked = (id) => {
    const liked = JSON.parse(localStorage.getItem("likedTestimonies") || "[]");
    return liked.includes(id);
  };

  const handleLike = async (id) => {
    // Get list of liked testimonies from localStorage
    const liked = JSON.parse(localStorage.getItem("likedTestimonies") || "[]");

    // Prevent multiple likes
    if (liked.includes(id)) {
      alert("You've already liked this testimony.");
      return;
    }

    try {
      const BASE_URL = import.meta.env.VITE_API_URL;
      await axios.post(`${BASE_URL}/api/testimonies/${id}/like`);

      // Update local UI
      setTestimonies((prev) =>
        prev.map((t) =>
          t._id === id ? { ...t, likes: (t.likes || 0) + 1 } : t
        )
      );

      // Add this ID to localStorage
      localStorage.setItem("likedTestimonies", JSON.stringify([...liked, id]));
    } catch (err) {
      console.error("Error liking testimony:", err);
    }
  };

  return (
    <>
      <Header />
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Testimonies</h1>
        {loading && <p>Loading testimonies...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {testimonies.length === 0 && !loading && (
          <p className="text-gray-500">No testimonies to display.</p>
        )}
        <div className="space-y-6">
          {testimonies.map(
            ({ _id, name, message, imageUrl, createdAt, likes }) => {
              const BASE = import.meta.env.VITE_API_URL.replace(/\/$/, "");
              const fullImageUrl = imageUrl?.startsWith("http")
                ? imageUrl
                : `${BASE}${imageUrl}`;
              console.log("imageUrl:", imageUrl);
              console.log("fullImageUrl:", fullImageUrl);
              return (
                <div key={_id} className="bg-white shadow p-4 rounded border">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-semibold text-lg">
                      {name || "Anonymous"}
                    </h2>
                    {createdAt && (
                      <span className="text-sm text-gray-400">
                        {new Date(createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 whitespace-pre-line">{message}</p>
                  {imageUrl && (
                    <img
                      src={
                        imageUrl.startsWith("http")
                          ? imageUrl
                          : `${import.meta.env.VITE_API_URL.replace(
                              /\/$/,
                              ""
                            )}${imageUrl}`
                      }
                      alt={`${name}'s testimony`}
                      className="mt-4 max-h-60 object-contain rounded border"
                    />
                  )}
                  <div className="like-container">
                    <button
                      onClick={() => handleLike(_id)}
                      className={`like-button ${
                        hasLiked(_id) ? "disabled" : ""
                      }`}
                      disabled={hasLiked(_id)}
                    >
                      {hasLiked(_id) ? "Liked ❤️" : "❤️ Like"}
                    </button>
                    <span className="like-count">
                      {likes || 0} like{(likes || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </>
  );
};

export default TestimoniesPage;
