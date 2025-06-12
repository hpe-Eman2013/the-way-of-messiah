import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import SubmitTestimony from "./pages/SubmitTestimony.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import ThankYou from "./pages/ThankYou.jsx"; // ← add this line

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SubmitTestimony />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/thank-you" element={<ThankYou />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
