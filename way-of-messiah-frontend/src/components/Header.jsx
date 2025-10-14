// src/components/Header.jsx
import { Link, NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between">
          {/* Left: Logo + Title */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="The Way of Messiah"
              className="h-10 w-10 rounded-full object-cover"
            />
            <span className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              The Way of Messiah
            </span>
          </Link>

          {/* Right: Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "text-black" : "text-gray-700 hover:text-black"
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/events"
              className={({ isActive }) =>
                isActive ? "text-black" : "text-gray-700 hover:text-black"
              }
            >
              Events
            </NavLink>
            <NavLink
              to="/donate"
              className={({ isActive }) =>
                isActive ? "text-black" : "text-gray-700 hover:text-black"
              }
            >
              Donate
            </NavLink>
            <NavLink
              to="/testimonies"
              className={({ isActive }) =>
                isActive ? "text-black" : "text-gray-700 hover:text-black"
              }
            >
              Testimonies
            </NavLink>
            <NavLink
              to="/admin/login"
              className="text-gray-700 hover:text-black"
            >
              Admin
            </NavLink>
          </nav>

          {/* Mobile menu */}
          <div className="md:hidden">
            <details className="relative">
              <summary className="list-none cursor-pointer px-3 py-2 border rounded-lg text-sm">
                Menu
              </summary>
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg p-2 flex flex-col">
                <Link to="/" className="px-3 py-2 rounded hover:bg-gray-50">
                  Home
                </Link>
                <Link
                  to="/events"
                  className="px-3 py-2 rounded hover:bg-gray-50"
                >
                  Events
                </Link>
                <Link
                  to="/donate"
                  className="px-3 py-2 rounded hover:bg-gray-50"
                >
                  Donate
                </Link>
                <Link
                  to="/testimonies"
                  className="px-3 py-2 rounded hover:bg-gray-50"
                >
                  Testimonies
                </Link>
                <Link
                  to="/admin/login"
                  className="px-3 py-2 rounded hover:bg-gray-50"
                >
                  Admin
                </Link>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
