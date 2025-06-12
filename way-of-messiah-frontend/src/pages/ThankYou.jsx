import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function ThankYou() {
  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-center p-6"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.h1
        className="text-3xl font-bold text-green-600 mb-4"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Thank you!
      </motion.h1>
      <motion.p
        className="text-gray-700 dark:text-gray-300 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        Your testimony has been submitted successfully.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, duration: 0.4 }}
      >
        <Link
          to="/"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Return to Home
        </Link>
      </motion.div>
    </motion.div>
  );
}
