import { Navigate, Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import ContactPage from "./pages/ContactPage";
import FlightsPage from "./pages/FlightsPage";
import HomePage from "./pages/HomePage";
import HotelsPage from "./pages/HotelsPage";
import RestaurantsPage from "./pages/RestaurantsPage";
import TourDetailPage from "./pages/TourDetailPage";
import ToursPage from "./pages/ToursPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/flights" element={<FlightsPage />} />
      <Route path="/hotels" element={<HotelsPage />} />
      <Route path="/restaurants" element={<RestaurantsPage />} />
      <Route path="/tours" element={<ToursPage />} />
      <Route path="/tours/:id" element={<TourDetailPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/AdminPanel" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
