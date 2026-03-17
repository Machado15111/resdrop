import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Requires authentication only
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Requires authentication + completed onboarding
export function OnboardedRoute() {
  const { isAuthenticated, isOnboarded, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOnboarded) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

// Redirects authenticated users away (for login/signup pages)
export function PublicOnlyRoute() {
  const { isAuthenticated, isOnboarded, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated && isOnboarded) return <Navigate to="/dashboard" replace />;
  if (isAuthenticated && !isOnboarded) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

// Requires auth but NOT completed onboarding (onboarding page only)
export function OnboardingRoute() {
  const { isAuthenticated, isOnboarded, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isOnboarded) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Requires authentication + admin role
export function AdminRoute() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
