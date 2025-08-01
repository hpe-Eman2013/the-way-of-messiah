import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import { CheckCircle, XCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminPage() {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

    const token = localStorage.getItem("adminToken"); 
  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchTestimonies = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/admin/testimonies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTestimonies(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError("Failed to load testimonies.");
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonies();
  }, []);

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === testimonies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(testimonies.map((t) => t._id));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return alert("Select at least one testimony.");
    try {
      await axios.post(
        `${BASE_URL}/admin/bulk-action`,
        { action, ids: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`Bulk action '${action}' complete.`);
      setTimeout(() => setSuccess(""), 3000);
      setTestimonies((prev) => {
        if (action === "delete") return prev.filter((t) => !selectedIds.includes(t._id));
        if (action === "approve") return prev.map((t) => selectedIds.includes(t._id) ? { ...t, approved: true } : t);
        if (action === "disapprove") return prev.map((t) => selectedIds.includes(t._id) ? { ...t, approved: false } : t);
        return prev;
      });
      setSelectedIds([]);
    } catch {
      alert("Bulk action failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2 items-center">
            <Link to="/" className="bg-blue-600 text-white px-4 py-2 rounded">Home</Link>
          <button
            onClick={() => {
              localStorage.removeItem("adminToken");
              window.location.href = "/admin-login";
            }}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >Logout</button>
          </div>
        </div>

        {loading && <p className="text-center">Loading...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {success && <p className="text-center text-green-600 font-medium">{success}</p>}

        <div className="mb-4 flex items-center gap-4">
          <input type="checkbox" checked={selectedIds.length === testimonies.length} onChange={toggleSelectAll} />
          <span className="mr-4">Select All</span>
          <CheckCircle
            className="cursor-pointer text-green-600"
            size={24}
            onClick={() => handleBulkAction("approve")}
            title="Approve Selected"
          />
          <XCircle
            className="cursor-pointer text-yellow-600"
            size={24}
            onClick={() => handleBulkAction("disapprove")}
            title="Disapprove Selected"
          />
          <Trash2
            className="cursor-pointer text-red-600"
            size={24}
            onClick={() => handleBulkAction("delete")}
            title="Delete Selected"
          />
        </div>

        <div className="space-y-4">
          {testimonies.map(({ _id, name, message, imageUrl, createdAt }) => (
            <div key={_id} className="border p-4 rounded bg-white">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(_id)}
                onChange={() => toggleSelection(_id)}
              />
                  <div>
                    <h2 className="text-lg font-semibold">{name || "Anonymous"}</h2>
                    {createdAt && <p className="text-sm text-gray-500">{new Date(createdAt).toLocaleDateString()}</p>}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-gray-800 whitespace-pre-line">{message}</p>
              {imageUrl && (
                <img src={imageUrl} alt="testimony image" className="mt-3 rounded border max-h-60 object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
