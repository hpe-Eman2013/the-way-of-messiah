// src/components/Footer.jsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-12 border-t bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} The Way of Messiah
          </p>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link to="/" className="text-gray-600 hover:text-black">Home</Link>
            <Link to="/events" className="text-gray-600 hover:text-black">Events</Link>
            <Link to="/donate" className="text-gray-600 hover:text-black">Donate</Link>
            <Link to="/testimonies" className="text-gray-600 hover:text-black">Testimonies</Link>
            <Link to="/admin/login" className="text-gray-600 hover:text-black">Admin</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
