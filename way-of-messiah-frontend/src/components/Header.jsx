import React from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Header() {
  const navLinkStyles = ({ isActive }) =>
    isActive
      ? "text-blue-600 font-semibold border-b-2 border-blue-600"
      : "text-gray-700 dark:text-gray-300 hover:text-blue-600";

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 shadow bg-white dark:bg-gray-800">
      <div className="flex items-center space-x-3">
        <img
          src={logo}
          alt="The Way of Messiah Seal"
          className="h-10 w-10 object-contain"
        />
        <span className="text-lg font-bold text-gray-800 dark:text-white">
          The Way of Messiah
        </span>
      </div>
      <nav className="flex space-x-6">
        <NavLink to="/" className={navLinkStyles}>
          Home
        </NavLink>
        <NavLink to="/submit-testimony" className={navLinkStyles}>
          Submit
        </NavLink>
        <NavLink to="/admin" className={navLinkStyles}>
          Admin
        </NavLink>
      </nav>
    </header>
  );
}
