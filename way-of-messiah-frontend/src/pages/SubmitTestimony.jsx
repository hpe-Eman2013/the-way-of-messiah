import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SubmitTestimony() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    message: "",
    image: null,
  });
  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Submitting...");

    const data = new FormData();
    data.append("name", formData.name);
    data.append("message", formData.message);
    if (formData.image) data.append("image", formData.image);

    try {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${BASE_URL}/submit-testimony`, {
        method: "POST",
        body: data,
      });

      if (!res.ok) throw new Error("Submission failed");
      navigate("/thank-you");
    } catch (err) {
      setStatus("There was an error submitting your testimony.");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-4 bg-white dark:bg-gray-900 rounded shadow">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
        Submit Your Testimony
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <textarea
          name="message"
          placeholder="Your Testimony"
          value={formData.message}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          rows="5"
          required
        />
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={handleChange}
          className="w-full"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>
      </form>
      {status && <p className="mt-4 text-sm text-center">{status}</p>}
    </div>
  );
}
