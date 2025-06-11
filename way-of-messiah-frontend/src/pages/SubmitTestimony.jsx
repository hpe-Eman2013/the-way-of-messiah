import React, { useState } from "react";

const SubmitTestimony = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
    imageUrl: "",
  });
  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      const response = await fetch(
        "https://api.thewayofmessiah.net/submit-testimony",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      
      const data = await response.json();
      if (response.ok) {
        setStatus("✅ Testimony submitted successfully!");
        setForm({ name: "", email: "", message: "", imageUrl: "" });
      } else {
        setStatus(`❌ ${data.error || "Submission failed."}`);
      }
    } catch (error) {
      setStatus("❌ An error occurred during submission.");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Submit Your Testimony</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Name (optional)"
          className="w-full p-2 border rounded"
          onChange={handleChange}
          value={form.name}
        />
        <input
          type="email"
          name="email"
          placeholder="Email (optional)"
          className="w-full p-2 border rounded"
          onChange={handleChange}
          value={form.email}
        />
        <textarea
          name="message"
          placeholder="Your testimony..."
          className="w-full p-2 border rounded"
          rows="4"
          required
          onChange={handleChange}
          value={form.message}
        />
        <input
          type="text"
          name="imageUrl"
          placeholder="Image URL (optional)"
          className="w-full p-2 border rounded"
          onChange={handleChange}
          value={form.imageUrl}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-700 text-white rounded"
        >
          Submit
        </button>
      </form>
      {status && <p className="mt-4 text-sm">{status}</p>}
    </div>
  );
};

export default SubmitTestimony;
