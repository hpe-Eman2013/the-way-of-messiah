import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function AdminPage() {
  const [testimonies, setTestimonies] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchData = async () => {
    const token = localStorage.getItem("adminToken"); 
    if (!token) return navigate("/admin-login");

    try {
      const BASE_URL = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${BASE_URL}/testimonies/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTestimonies(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch admin data.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mt-4">Admin Dashboard</h1>
      {error && <p className="text-red-600 text-center">{error}</p>}
      {/* Map testimonies, include approve/unapprove/delete buttons */}
    </div>
  );
}
