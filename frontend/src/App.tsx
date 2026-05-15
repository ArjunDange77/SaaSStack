import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { AppShell } from "@/components/shell/AppShell";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { PgDashboard } from "@/pages/PgDashboard";
import { PublicBookingPage } from "@/pages/PublicBookingPage";
import { ResidentPortal } from "@/pages/ResidentPortal";
import { ResourceDetailRoute, ResourceListRoute } from "@/pages/ResourceRoute";

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role === "resident") {
    const path = location.pathname;
    const allowed =
      path === "/resident" ||
      path.startsWith("/r/pg-complaints") ||
      path.startsWith("/r/pg-documents") ||
      path.startsWith("/r/pg-rent-records");
    if (!allowed) {
      return <Navigate to="/resident" replace />;
    }
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/book/:tenantSlug" element={<PublicBookingPage />} />
      <Route
        path="/resident"
        element={
          <Protected>
            <ResidentPortal />
          </Protected>
        }
      />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="dashboard" element={<PgDashboard />} />
        <Route path="r/:slug" element={<ResourceListRoute />} />
        <Route path="r/:slug/:id" element={<ResourceDetailRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
