import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import SubmitTestimony from "./pages/SubmitTestimony";
import Layout from "./components/Layout";
import ThankYou from "./pages/ThankYou";
import Home from "./pages/Home";
import TestimoniesPage from "./pages/TestimoniesPage";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/testimonies" element={<TestimoniesPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/submit-testimony" element={<SubmitTestimony />} />
          <Route path="/thank-you" element={<ThankYou />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
