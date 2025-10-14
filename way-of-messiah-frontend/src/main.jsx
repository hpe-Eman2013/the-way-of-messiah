import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // import the main App component
import "../src/assets/css/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Render the App component (App will handle routing internally) */}
    <App />
  </React.StrictMode>
);
