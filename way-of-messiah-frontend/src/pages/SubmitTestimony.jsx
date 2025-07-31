// SubmitTestimony.jsx (with Home link added)

import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function SubmitTestimony() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [imageSource, setImageSource] = useState("upload");
  const [status, setStatus] = useState("");
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");

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
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Your Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <textarea
        placeholder="Your Testimony"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
      />

      <div>
        <label>Image Source:</label><br />
        <label>
          <input
            type="radio"
            value="upload"
            checked={imageSource === "upload"}
            onChange={() => setImageSource("upload")}
          /> Upload from device
        </label>
        
      </div>
      <div>
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
          placeholder="https://example.com/photo.jpg"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      )}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
