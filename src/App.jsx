import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './App.css';
import Header from './components/Header';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
// import PlatformStrip from './components/PlatformStrip';
import PriceStrategy from './components/PriceStrategy';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
// Core auth + app-shell routes stay eager for instant first interaction.
import Login from './components/Login';
import Signup from './components/Signup';
import DashboardPage from './components/DashboardPage';
import SubmitBookingPage from './components/SubmitBookingPage';
import BookingDetailPage from './components/BookingDetailPage';
import Onboarding from './components/Onboarding';
import Account from './components/Account';
import ResetPassword from './components/ResetPassword';
import ResDroppLanding from './components/ResDroppLanding';
import ResDroppLogin from './components/ResDroppLogin';
import { ProtectedRoute, OnboardedRoute, PublicOnlyRoute, OnboardingRoute, AdminRoute } from './components/ProtectedRoute';

// Heavy / rarely-first-loaded routes are code-split so they don't bloat the
// initial bundle (admin dashboards, analytics, content pages, landing previews).
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminSpecialFares = lazy(() => import('./components/AdminSpecialFares'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const AlertsPage = lazy(() => import('./components/AlertsPage'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const TermsPage = lazy(() => import('./components/TermsPage'));
const PremiumLanding = lazy(() => import('./components/PremiumLanding'));
const TravelerLanding = lazy(() => import('./components/TravelerLanding'));


function LayoutWithHeader() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <PriceStrategy />
      <Pricing />
      <Footer />
    </>
  );
}

function PlansPage() {
  return (
    <>
      <Pricing />
      <Footer />
    </>
  );
}

function App() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Warm the code-split route chunks during idle time after first paint, so the
  // first navigation to each doesn't wait on a network round-trip (no blank flash).
  useEffect(() => {
    const warm = () => {
      import('./components/AlertsPage');
      import('./components/AnalyticsDashboard');
      import('./components/AboutPage');
      import('./components/PrivacyPage');
      import('./components/TermsPage');
    };
    const ric = window.requestIdleCallback;
    const id = ric ? ric(warm, { timeout: 3000 }) : setTimeout(warm, 1500);
    return () => (ric && window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);

  if (loading) return null;

  // The dramatic full-screen "curtain" reveal is a first-impression effect for the
  // marketing landing pages only. In-app navigation uses a fast, subtle fade so
  // switching between Dashboard / Submit / Account etc. feels instant.
  const LANDING_ROUTES = ['/', '/v2', '/v3', '/v4'];
  const transitionClass = LANDING_ROUTES.includes(location.pathname)
    ? 'page-transition'
    : 'page-fade';

  return (
    <div className="app">
      {/* The key is only applied to marketing routes, where remounting replays the
          curtain reveal. In-app navigation omits it so React reconciles instead of
          tearing down and rebuilding the whole tree (and replaying an animation)
          on every page change — cached pages then paint immediately. */}
      <div
        key={transitionClass === 'page-transition' ? location.pathname : 'app'}
        className={transitionClass}
      >
        <Suspense fallback={null}>
        <Routes location={location}>
          {/* Admin — no header, admin-only */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/special-fares" element={<AdminSpecialFares />} />
          </Route>

          {/* Premium Landing Preview - No existing header */}
          <Route path="/v2" element={<PremiumLanding />} />

          {/* Traveler Landing Preview */}
          <Route path="/v3" element={<TravelerLanding />} />

          {/* ResDropp Premium SaaS Landing */}
          <Route path="/v4" element={<ResDroppLanding />} />

          {/* Landing page — no app header (ResDroppLanding has its own) */}
          <Route path="/" element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResDroppLanding />
          } />

          {/* Premium standalone login — no app header */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResDroppLogin />
          } />

          {/* All other routes — with header */}
          <Route element={<LayoutWithHeader />}>

            {/* Auth routes — redirect if already logged in */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/signup" element={<Signup />} />
            </Route>

            {/* Password reset — public, no auth required */}
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Onboarding — requires auth, must NOT be onboarded */}
            <Route element={<OnboardingRoute />}>
              <Route path="/onboarding" element={<Onboarding />} />
            </Route>

            {/* Protected + onboarded routes */}
            <Route element={<OnboardedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/bookings/:id" element={<BookingDetailPage />} />
              <Route path="/submit" element={<SubmitBookingPage />} />
              <Route path="/account" element={<Account />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
            </Route>

            {/* Public */}
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default App;
