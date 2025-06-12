import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <div className="flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          Welcome to The Way of Messiah
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-xl">
          Sharing testimonies to glorify God and encourage others. Use the links
          below to contribute or explore.
        </p>
        <div className="space-x-4">
          <Link
            to="/submit-testimony"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Submit Testimony
          </Link>
          <Link
            to="/admin"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Admin Page
          </Link>
        </div>
      </div>
    </div>
  );
}
