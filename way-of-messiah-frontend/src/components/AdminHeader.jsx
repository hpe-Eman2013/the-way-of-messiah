// src/components/AdminHeader.jsx
import { useNavigate, Link } from "react-router-dom";

export default function AdminHeader() {
  const navigate = useNavigate();

  const onLogout = () => {
    localStorage.removeItem("jwt");     // <-- remove the token here
    navigate("/admin/login");
  };

  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/admin" className="font-semibold">Admin</Link>
          <Link to="/admin/events">Events</Link>
          <Link to="/admin/testimonies">Testimonies</Link>
        </nav>
        <button
          onClick={onLogout}
          className="px-3 py-1 rounded border hover:bg-gray-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
