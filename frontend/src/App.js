import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useFirebaseAuth } from "./auth/FirebaseAuthContext";
import CookieConsentBanner from "./components/CookieConsentBanner";
import PageLoader from "./components/PageLoader";
import {
  getPageLoaderMinimumDuration,
  waitForPageLoaderCycle,
} from "./lib/pageLoaderTiming";
import HomePage from "./pages/HomePage";

function lazyWithMinimumLoader(importPage) {
  return lazy(async () => {
    const startedAt = Date.now();
    const pageModule = await importPage();
    await waitForPageLoaderCycle(startedAt);
    return pageModule;
  });
}

const AdminPage = lazyWithMinimumLoader(() => import("./pages/AdminPage"));
const AboutPage = lazyWithMinimumLoader(() => import("./pages/AboutPage"));
const BlogDetailPage = lazyWithMinimumLoader(() => import("./pages/BlogDetailPage"));
const BlogPage = lazyWithMinimumLoader(() => import("./pages/BlogPage"));
const ContactPage = lazyWithMinimumLoader(() => import("./pages/ContactPage"));
const FlightsPage = lazyWithMinimumLoader(() => import("./pages/FlightsPage"));
const HotelsPage = lazyWithMinimumLoader(() => import("./pages/HotelsPage"));
const LoginPage = lazyWithMinimumLoader(() => import("./pages/LoginPage"));
const ProfilePage = lazyWithMinimumLoader(() => import("./pages/ProfilePage"));
const RegisterPage = lazyWithMinimumLoader(() => import("./pages/RegisterPage"));
const RestaurantsPage = lazyWithMinimumLoader(() => import("./pages/RestaurantsPage"));
const TourDetailPage = lazyWithMinimumLoader(() => import("./pages/TourDetailPage"));
const ToursPage = lazyWithMinimumLoader(() => import("./pages/ToursPage"));
const VisaServicesPage = lazyWithMinimumLoader(() => import("./pages/VisaServicesPage"));

function RouteLoadingFallback() {
  return <PageLoader />;
}

function useInitialLoaderCycle() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, getPageLoaderMinimumDuration());

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return isVisible;
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { currentUser, ensureAuthReady, loading } = useFirebaseAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsCheckingAuth(true);

    ensureAuthReady()
      .catch(() => {})
      .finally(() => {
        if (isActive) {
          setIsCheckingAuth(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [ensureAuthReady]);

  if (loading || isCheckingAuth) {
    return <RouteLoadingFallback />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const showInitialLoader = useInitialLoaderCycle();
  const showCookieConsent = !location.pathname
    .toLowerCase()
    .startsWith("/adminpanel");

  return (
    <>
      <Suspense fallback={showInitialLoader ? null : <RouteLoadingFallback />}>
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
          <Route path="/tours/:idOrSlug" element={<TourDetailPage />} />
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
      {showInitialLoader ? <PageLoader /> : null}
      {showCookieConsent ? <CookieConsentBanner /> : null}
    </>
  );
}
