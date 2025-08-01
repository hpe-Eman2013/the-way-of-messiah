import { useState } from "react";
import axios from "axios";
import Header from "../components/Header";

const AdminEventForm = () => {
  const [form, setForm] = useState({
    name: "",
    date: "",
    time: "",
    location: "",
    description: "",
    link: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const BASE_URL = import.meta.env.VITE_API_URL;
      await axios.post(`${BASE_URL}/api/events`, form);
      setMessage("Event successfully added!");
      setForm({ name: "", date: "", time: "", location: "", description: "", link: "" });
    } catch (err) {
      setMessage("Failed to add event. Check console.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <Header />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Add New Event</h1>
        {message && <p className="mb-4 text-blue-600">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" value={form.name} onChange={handleChange} required placeholder="Event Name" className="w-full p-2 border rounded" />
          <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full p-2 border rounded" />
          <input name="time" value={form.time} onChange={handleChange} placeholder="Time (e.g., 6:30 PM)" className="w-full p-2 border rounded" />
          <input name="location" value={form.location} onChange={handleChange} placeholder="Location" className="w-full p-2 border rounded" />
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="Event Description" className="w-full p-2 border rounded" rows="4"></textarea>
          <input name="link" value={form.link} onChange={handleChange} placeholder="Optional Link (e.g. RSVP or Stream)" className="w-full p-2 border rounded" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Submit Event</button>
        </form>
      </div>
    </div>
  );
};

export default AdminEventForm;
