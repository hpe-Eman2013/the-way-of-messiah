import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";

export default function AdminPage() {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

    const token = localStorage.getItem("adminToken"); 
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchTestimonies = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/admin/testimonies`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("Response from server:", res.data);

        if (Array.isArray(res.data)) {
        setTestimonies(res.data);
        } else {
          console.error("Unexpected testimony format:", res.data);
          setTestimonies([]);
        }
      } catch (err) {
        console.error("Error loading testimonies:", err);
        setError("Failed to load testimonies.");
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonies();
  }, []);

  const handleApproval = async (id, approved) => {
    try {
      await axios.patch(
        `${BASE_URL}/admin/testimonies/${id}/approve`,
        { approved },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess(`Testimony has been ${approved ? "approved" : "unapproved"}.`);
      setTimeout(() => setSuccess(""), 3000);
      setTestimonies((prev) =>
        prev.map((t) => (t._id === id ? { ...t, approved } : t))
      );
    } catch {
      alert("Error updating approval status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this testimony?")) return;
    try {
      await axios.delete(`${BASE_URL}/admin/testimonies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTestimonies((prev) => prev.filter((t) => t._id !== id));
      setSuccess("Testimony deleted.");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      alert("Error deleting testimony.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={() => {
              localStorage.removeItem("adminToken");
              window.location.href = "/admin-login";
            }}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>

        {loading && <p className="text-center">Loading...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {success && <p className="text-center text-green-600 font-medium">{success}</p>}
        {!loading && Array.isArray(testimonies) && testimonies.length === 0 && (
          <p className="text-center text-gray-600">No testimonies to display.</p>
        )}

        <div className="space-y-6">
          {Array.isArray(testimonies) ? (
            testimonies.map(
            ({ _id, name, message, imageUrl, createdAt, approved }) => (
              <div
                key={_id}
                className="bg-white p-6 rounded-lg shadow border border-gray-200"
              >
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {name || "Anonymous"}
                  </h2>
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
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleApproval(_id, !approved)}
                    className={`px-3 py-1 rounded text-white ${
                      approved ? "bg-yellow-600" : "bg-green-600"
                    }`}
                  >
                    {approved ? "Unapprove" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleDelete(_id)}
                    className="px-3 py-1 bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
            )
          ) : (
            <p className="text-center text-gray-600">Unable to load testimonies.</p>
          )}
        </div>
      </div>
    </div>
  );
}
