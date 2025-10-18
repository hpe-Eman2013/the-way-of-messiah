import { useState } from "react";
import "../assets/css/SubmitTestimony.css";
import { API_BASE } from "../lib/api";

const SubmitTestimony = () => {
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
      const res = await fetch(`${API_BASE}/submit-testimony`, {
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
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <input
        type="text"
        placeholder="Your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br />
      <br />
      <textarea
        placeholder="Your testimony"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
      />
      <br />
      <br />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
      />
      <br />
      <br />
      <button type="submit">Submit</button>
      {status && <p>{status}</p>}
    </form>
  );
};

export default SubmitTestimony;
