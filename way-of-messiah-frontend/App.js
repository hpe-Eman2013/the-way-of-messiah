import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import your pages/components for each route:
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import SubmitTestimony from "./pages/SubmitTestimony";
import ThankYou from "./pages/ThankYou";
import Testimonies from "./pages/Testimonies";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Define each route path and its component */}
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/submit-testimony" element={<SubmitTestimony />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/testimonies" element={<Testimonies />} />
        {/* (Optional) Catch-all route for undefined paths:
        <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
