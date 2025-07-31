import { useState } from "react";
import axios from "axios";
import "../assets/css/SubmitTestimony.css"; // Make sure this CSS file exists

export default function SubmitTestimony() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [imageSource, setImageSource] = useState("upload");
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState(""); // "success" or "error"


  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("message", message);

    if (imageSource === "upload" && file) {
      formData.append("image", file);
    } else if (imageSource === "url") {
      formData.append("imageUrl", imageUrl);
    }

    try {
      const BASE_URL = import.meta.env.VITE_API_URL;
      await axios.post(`${BASE_URL}/submit`, formData);
      setStatusMessage("Testimony submitted successfully!");
      setStatusType("success");
      // Optional: reset form
      setName("");
      setMessage("");
      setFile(null);
      setImageUrl("");
    } catch (err) {
      setStatusMessage("Submission failed. Please try again.");
      setStatusType("error");
    }
  };

  return (
    <form className="testimony-form" onSubmit={handleSubmit}>
      <h2>SUBMIT YOUR TESTIMONY</h2>

      <label htmlFor="name">Full Name:</label>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <label htmlFor="message">Testimony:</label>
      <textarea
        id="message"
        rows="4"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
      />

      <div className="radio-group">
        <label>
          <input
            type="radio"
            value="upload"
            checked={imageSource === "upload"}
            onChange={() => setImageSource("upload")}
          />
          Upload from device
        </label>
        {imageSource === "upload" && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
        )}
      </div>

      <div className="radio-group">
        <label>
          <input
            type="radio"
            value="url"
            checked={imageSource === "url"}
            onChange={() => setImageSource("url")}
          />
          Link from URL
        </label>
        {imageSource === "url" && (
          <input
            type="text"
            placeholder="https://example.com/photo.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        )}
      </div>
        {statusMessage && (
          <div className={`status-message ${statusType}`}>
            {statusMessage}
          </div>
        )}
      <button type="submit">Submit</button>
    </form>
  );
}
