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
    if (imageSource === "upload" && file) {
      formData.append("image", file);
    } else if (imageSource === "url") {
      formData.append("imageUrl", imageUrl);
    }

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
         <label>Image Source:</label><br />
      <label>
        <input
          type="radio"
          value="upload"
          checked={imageSource === "upload"}
          onChange={() => setImageSource("upload")}
        /> Upload from device
      </label>
      <label>
        <input
          type="radio"
          value="url"
          checked={imageSource === "url"}
          onChange={() => setImageSource("url")}
        /> Link from URL
      </label>

      {imageSource === "upload" && (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
        />
      )}

      {imageSource === "url" && (
        <input
          type="text"
          placeholder="https://example.com/image.jpg"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      )}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Submit
        </button>
      </form>
      {status && <p className="mt-4 text-green-600">{status}</p>}
    </div>
  );
}
