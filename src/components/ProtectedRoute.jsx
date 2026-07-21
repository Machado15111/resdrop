import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Requires authentication only
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to={`/login${location.search}`} replace />;
  return <Outlet />;
}

// Requires authentication + completed onboarding
export function OnboardedRoute() {
  const { isAuthenticated, isOnboarded, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to={`/login${location.search}`} replace />;
  if (!isOnboarded) return <Navigate to={`/onboarding${location.search}`} replace />;
  return <Outlet />;
}

// Redirects authenticated users away (for login/signup pages)
export function PublicOnlyRoute() {
  const { isAuthenticated, isOnboarded, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (isAuthenticated && isOnboarded) return <Navigate to={`/dashboard${location.search}`} replace />;
  if (isAuthenticated && !isOnboarded) return <Navigate to={`/onboarding${location.search}`} replace />;
  return <Outlet />;
}

// Requires auth but NOT completed onboarding (onboarding page only)
export function OnboardingRoute() {
  const { isAuthenticated, isOnboarded, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to={`/login${location.search}`} replace />;
  if (isOnboarded) return <Navigate to={`/dashboard${location.search}`} replace />;
  return <Outlet />;
}

// Requires authentication + admin role
export function AdminRoute() {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to={`/login${location.search}`} replace />;
  if (!user?.isAdmin) return <Navigate to={`/dashboard${location.search}`} replace />;
  return <Outlet />;
}
