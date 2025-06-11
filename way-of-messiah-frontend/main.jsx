
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SubmitTestimony from './SubmitTestimony';
import AdminPage from './AdminPage';

const App = () => (
  <Router>
    <Routes>
      <Route path="/submit-testimony" element={<SubmitTestimony />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  </Router>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
