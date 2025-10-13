import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Admin from "./pages/AdminPage";
import SubmitTestimony from "./pages/SubmitTestimony";
import ThankYou from "./pages/ThankYou";
import Testimonies from "./pages/TestimoniesPage";
import AdminLogin from "./pages/AdminLogin";
import PrivateRoute from "./components/PrivateRoute";
import EventsPage from "./pages/EventsPage";
import CalendarView from "./pages/CalendarView";
import DonatePage from "./pages/DonatePage.jsx";
import DonationSuccess from "./pages/DonationSuccess";
import DonationCancel from "./pages/DonationCancel";
import DonateThankYou from "./pages/DonateThankYou";
import AdminEventsList from "./pages/admin/AdminEventsList";
import AdminEventForm from "./pages/admin/AdminEventForm";

// Inside <Routes>:

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {import.meta.env.MODE === "development" && (
          <>
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <Admin />
                </PrivateRoute>
              }
            />
          </>
        )}
        <Route path="/submit-testimony" element={<SubmitTestimony />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/testimonies" element={<Testimonies />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/calendar-view" element={<CalendarView />} />
        <Route path="/donate" element={<DonatePage />} />
        <Route path="/donate/success" element={<DonationSuccess />} />
        <Route path="/donate/cancel" element={<DonationCancel />} />
        <Route path="/donate/thank-you" element={<DonateThankYou />} />
        <Route path="/admin/events" element={<AdminEventsList />} />
        <Route path="/admin/events/new" element={<AdminEventForm />} />
        <Route path="/admin/events/:id" element={<AdminEventForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
