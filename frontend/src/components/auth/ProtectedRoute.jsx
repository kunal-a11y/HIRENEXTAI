import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';

export default function ProtectedRoute() {
  const { isAuthenticated, isDemoMode } = useAuthStore();

  if (!isAuthenticated && !isDemoMode) {
    // In local dev, send users to demo chat instead of a blank login loop
    if (import.meta.env.DEV) {
      return <Navigate to="/demo" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
