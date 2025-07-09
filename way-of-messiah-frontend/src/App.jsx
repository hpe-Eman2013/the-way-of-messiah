import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import your pages/components for each route:
import Home from "./pages/Home";
import Admin from "./pages/AdminPage";
import SubmitTestimony from "./pages/SubmitTestimony";
import ThankYou from "./pages/ThankYou";
import Testimonies from "./pages/TestimoniesPage";
import AdminLogin from "./pages/AdminLogin";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Define each route path and its component */}
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<PrivateRoute> <Admin /> </PrivateRoute>} />
        <Route path="/admin-login" element={<AdminLogin />} />
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
