// SubmitTestimony.jsx (with Home link added)

import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function SubmitTestimony() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");

    const data = new FormData();
    data.append("name", name);
    data.append("message", message);
    if (image) data.append("image", image);

    try {
      const BASE_URL = import.meta.env.VITE_API_URL;
      const res = await fetch(`${BASE_URL}/api/submit-testimony`, {
        method: "POST",
        body: data,
      });

      if (res.ok) {
        setStatus("Testimony submitted successfully.");
        setName("");
        setMessage("");
        setImage(null);
      } else {
        const err = await res.json();
        setStatus(err.error || "Failed to submit testimony.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      setStatus("Submission failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Submit Testimony</h1>
        <Link to="/" className="text-blue-600 underline">Home</Link>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2"
        />
        <textarea
          placeholder="Your testimony"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border p-2"
        ></textarea>
        <input
          type="file"
          onChange={(e) => setImage(e.target.files[0])}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Submit
        </button>
      </form>
      {status && <p className="mt-4 text-green-600">{status}</p>}
    </div>
  );
}
