import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { AppShell } from "@/components/shell/AppShell";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { PgDashboard } from "@/pages/PgDashboard";
import { SbAttendanceHistory } from "@/pages/school_bus/SbAttendanceHistory";
import { SbDashboard } from "@/pages/school_bus/SbDashboard";
import { SbDriverIncident } from "@/pages/school_bus/SbDriverIncident";
import { SbDriverToday } from "@/pages/school_bus/SbDriverToday";
import { SbDriverTrip } from "@/pages/school_bus/SbDriverTrip";
import { SbFees } from "@/pages/school_bus/SbFees";
import { SbNotifications } from "@/pages/school_bus/SbNotifications";
import { SbParentPortal } from "@/pages/school_bus/SbParentPortal";
import { PublicBookingPage } from "@/pages/PublicBookingPage";
import { ResidentPortal } from "@/pages/ResidentPortal";
import { ResourceDetailRoute, ResourceListRoute } from "@/pages/ResourceRoute";

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated, role, driverId } = useAuth();
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
  if (role === "parent") {
    const path = location.pathname;
    if (path !== "/sb/parent" && !path.startsWith("/sb/parent/")) {
      return <Navigate to="/sb/parent" replace />;
    }
  }
  if (driverId && role !== "owner" && role !== "parent") {
    const path = location.pathname;
    const onDriver =
      path === "/sb/driver" ||
      path.startsWith("/sb/driver/");
    const onOperatorShell =
      path === "/" ||
      path === "/dashboard" ||
      path.startsWith("/r/");
    if (onOperatorShell && !onDriver) {
      return <Navigate to="/sb/driver" replace />;
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
        path="/sb/parent"
        element={
          <Protected>
            <SbParentPortal />
          </Protected>
        }
      />
      <Route
        path="/sb/driver"
        element={
          <Protected>
            <SbDriverToday />
          </Protected>
        }
      />
      <Route
        path="/sb/driver/trip/:id"
        element={
          <Protected>
            <SbDriverTrip />
          </Protected>
        }
      />
      <Route
        path="/sb/driver/incident"
        element={
          <Protected>
            <SbDriverIncident />
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
        <Route path="sb/dashboard" element={<SbDashboard />} />
        <Route path="sb/fees" element={<SbFees />} />
        <Route path="sb/notifications" element={<SbNotifications />} />
        <Route path="sb/attendance" element={<SbAttendanceHistory />} />
        <Route path="r/:slug" element={<ResourceListRoute />} />
        <Route path="r/:slug/:id" element={<ResourceDetailRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
