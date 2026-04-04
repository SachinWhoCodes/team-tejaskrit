import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import LoadingScreen from "@/pages/LoadingScreen";

export default function RequireTpo({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Only TPO/Admin can access this panel
  if (profile?.role !== "tpo" && profile?.role !== "admin") {
    return <Navigate to="/access-denied" replace />;
  }

  // If logged in but not onboarded to an institute yet
  if (!profile?.instituteId) {
    return <Navigate to="/register-college" replace />;
  }

  return children;
}
