import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './App.css';
import Header from './components/Header';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
// import PlatformStrip from './components/PlatformStrip';
import PriceStrategy from './components/PriceStrategy';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import Login from './components/Login';
import Signup from './components/Signup';
import DashboardPage from './components/DashboardPage';
import SubmitBookingPage from './components/SubmitBookingPage';
import BookingDetailPage from './components/BookingDetailPage';
import AlertsPage from './components/AlertsPage';
import Onboarding from './components/Onboarding';
import Account from './components/Account';
import AdminDashboard from './components/AdminDashboard';
import AdminSpecialFares from './components/AdminSpecialFares';
import AboutPage from './components/AboutPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import ResetPassword from './components/ResetPassword';
import { ProtectedRoute, OnboardedRoute, PublicOnlyRoute, OnboardingRoute, AdminRoute } from './components/ProtectedRoute';
import PremiumLanding from './components/PremiumLanding';
import TravelerLanding from './components/TravelerLanding';
import ResDroppLanding from './components/ResDroppLanding';


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

  if (loading) return null;

  return (
    <div className="app">
      <Routes>
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

        {/* Landing page — no app header (TravelerLanding has its own) */}
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <TravelerLanding />
        } />

        {/* All other routes — with header */}
        <Route element={<LayoutWithHeader />}>

          {/* Auth routes — redirect if already logged in */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
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
    </div>
  );
}

export default App;
