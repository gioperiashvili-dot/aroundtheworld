import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useFirebaseAuth } from "./auth/FirebaseAuthContext";
import HomePage from "./pages/HomePage";

const AdminPage = lazy(() => import("./pages/AdminPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetailPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const FlightsPage = lazy(() => import("./pages/FlightsPage"));
const HotelsPage = lazy(() => import("./pages/HotelsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const RestaurantsPage = lazy(() => import("./pages/RestaurantsPage"));
const TourDetailPage = lazy(() => import("./pages/TourDetailPage"));
const ToursPage = lazy(() => import("./pages/ToursPage"));
const VisaServicesPage = lazy(() => import("./pages/VisaServicesPage"));

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[12rem] w-full max-w-[1500px] items-center justify-center">
        <div
          className="h-10 w-10 rounded-full border-2 border-white/18 border-t-white/82 animate-spin"
          role="status"
          aria-label="Loading page"
        />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { currentUser, loading } = useFirebaseAuth();

  if (loading) {
    return <RouteLoadingFallback />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/flights" element={<FlightsPage />} />
        <Route path="/hotels" element={<HotelsPage />} />
        <Route path="/restaurants" element={<RestaurantsPage />} />
        <Route path="/visa-services" element={<VisaServicesPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogDetailPage />} />
        <Route path="/tours" element={<ToursPage />} />
        <Route path="/tours/:id" element={<TourDetailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="/AdminPanel" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
