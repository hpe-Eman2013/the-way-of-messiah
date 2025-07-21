import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
        <Route path="/" element={<Home />} />
        {import.meta.env.MODE === "development" && (
          <>
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
          </>
        )}
        <Route path="/submit-testimony" element={<SubmitTestimony />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/testimonies" element={<Testimonies />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
