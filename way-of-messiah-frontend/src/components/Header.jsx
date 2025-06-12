import React from "react";
import logo from '../assets/logo.png';
<img src={logo} alt="Great Seal" className="w-12 h-12 mr-3" />

export default function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow-md">
      <div className="flex items-center">
        <img
          src="/logo_128.png"
          alt="Great Seal - The Way of Messiah"
          className="w-12 h-12 mr-3"
        />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          The Way of Messiah
        </h1>
      </div>
      <nav className="space-x-4">
        <a href="/" className="text-gray-600 dark:text-gray-300 hover:underline">
          Home
        </a>
        <a href="/submit-testimony" className="text-gray-600 dark:text-gray-300 hover:underline">
          Submit Testimony
        </a>
        <a href="/donate" className="text-gray-600 dark:text-gray-300 hover:underline">
          Donate
        </a>
      </nav>
    </header>
  );
}
