import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground mt-3">Loading…</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requireOnboarded = true,
}: {
  children: React.ReactNode;
  requireOnboarded?: boolean;
}) {
  const { authUser, userDoc, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!authUser) return <Navigate to="/login" replace />;

  if (requireOnboarded && !userDoc?.onboardedAt) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
