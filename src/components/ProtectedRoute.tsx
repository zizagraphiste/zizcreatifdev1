import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, userRole, loading } = useAuth();

  // Attendre si : chargement en cours OU session présente mais rôle pas encore résolu
  if (loading || (session && userRole === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-muted-foreground animate-pulse">Chargement…</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, userRole, loading } = useAuth();

  // Attendre si : chargement en cours OU session présente mais rôle pas encore résolu
  if (loading || (session && userRole === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-muted-foreground animate-pulse">Chargement…</span>
      </div>
    );
  }

  if (!session || userRole !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
