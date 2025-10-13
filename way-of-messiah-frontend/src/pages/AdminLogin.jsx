import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./lib/api"; // shared axios instance with interceptor

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-redirect if a token already exists (normalize legacy key -> jwt)
  useEffect(() => {
    const legacy = localStorage.getItem("adminToken");
    if (legacy && !localStorage.getItem("jwt")) {
      localStorage.setItem("jwt", legacy);
      localStorage.removeItem("adminToken");
    }
    if (localStorage.getItem("jwt")) navigate("/admin");
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // api base already includes /api if you set VITE_API_URL=.../api
      const { data } = await api.post("/admin/login", { username, password });
      // Store JWT for protected requests (interceptor will attach it)
      localStorage.setItem("jwt", data.token);
      navigate("/admin");
    } catch (err) {
      if (err.response?.status === 401)
        setError("Invalid username or password.");
      else setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Admin Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <br />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />
        <br />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
