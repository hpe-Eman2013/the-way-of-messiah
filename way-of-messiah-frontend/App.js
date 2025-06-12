import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import SubmitTestimony from "./pages/SubmitTestimony";
import Layout from "./components/Layout";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/submit-testimony" element={<SubmitTestimony />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
