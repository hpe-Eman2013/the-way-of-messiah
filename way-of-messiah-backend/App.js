import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import SubmitTestimony from "./pages/SubmitTestimony";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/submit-testimony" element={<SubmitTestimony />} />
      </Routes>
    </Router>
  );
}

export default App;
