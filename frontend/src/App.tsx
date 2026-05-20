import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { AppShell } from "@/components/shell/AppShell";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardRoute } from "@/pages/DashboardRoute";
import { isSchoolBusTenant } from "@/lib/schoolBusTenant";
import { SbAttendancePage } from "@/pages/school_bus/SbAttendancePage";
import { SbSchedulePage } from "@/pages/school_bus/SbSchedulePage";
import { SbTripDetailRoute } from "@/pages/school_bus/SbTripDetailRoute";
import { SbTripsPage } from "@/pages/school_bus/SbTripsPage";
import { SbDashboard } from "@/pages/school_bus/SbDashboard";
import { SbDriverIncident } from "@/pages/school_bus/SbDriverIncident";
import { SbDriverToday } from "@/pages/school_bus/SbDriverToday";
import { SbDriverTrip } from "@/pages/school_bus/SbDriverTrip";
import { SbFees } from "@/pages/school_bus/SbFees";
import { SbNotifications } from "@/pages/school_bus/SbNotifications";
import { SbParentPortal } from "@/pages/school_bus/SbParentPortal";
import { PublicBookingPage } from "@/pages/PublicBookingPage";
import { ResidentPortal } from "@/pages/ResidentPortal";
import { PortalRoute } from "@/components/PortalRoute";
import { ResourceDetailRoute, ResourceListRoute } from "@/pages/ResourceRoute";

function SbTripDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/sb/trips/${id ?? ""}`} replace />;
}

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated, role, driverId, tenantSlug } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
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
  const onDriverRoute =
    location.pathname === "/sb/driver" || location.pathname.startsWith("/sb/driver/");
  if (onDriverRoute && !driverId && (role === "owner" || role === "staff")) {
    return (
      <Navigate
        to={isSchoolBusTenant(tenantSlug) ? "/sb/dashboard" : "/dashboard"}
        replace
      />
    );
  }
  if (role === "driver" || (driverId && role !== "owner" && role !== "staff" && role !== "parent")) {
    const path = location.pathname;
    const onDriverPortal =
      path === "/sb/driver" || path.startsWith("/sb/driver/");
    if (!onDriverPortal) {
      return <Navigate to="/sb/driver" replace />;
    }
  }
  if (
    isSchoolBusTenant(tenantSlug) &&
    (role === "owner" || role === "staff") &&
    location.pathname === "/dashboard"
  ) {
    return <Navigate to="/sb/dashboard" replace />;
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
            <PortalRoute requiredRole="resident">
              <ResidentPortal />
            </PortalRoute>
          </Protected>
        }
      />
      <Route
        path="/sb/parent"
        element={
          <Protected>
            <PortalRoute requiredRole="parent">
              <SbParentPortal />
            </PortalRoute>
          </Protected>
        }
      />
      <Route
        path="/sb/driver"
        element={
          <Protected>
            <PortalRoute requiredRole="driver">
              <SbDriverToday />
            </PortalRoute>
          </Protected>
        }
      />
      <Route
        path="/sb/driver/trip/:id"
        element={
          <Protected>
            <PortalRoute requiredRole="driver">
              <SbDriverTrip />
            </PortalRoute>
          </Protected>
        }
      />
      <Route
        path="/sb/driver/incident"
        element={
          <Protected>
            <PortalRoute requiredRole="driver">
              <SbDriverIncident />
            </PortalRoute>
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
        <Route path="dashboard" element={<DashboardRoute />} />
        <Route path="sb/dashboard" element={<SbDashboard />} />
        <Route path="sb/trips" element={<SbTripsPage />} />
        <Route path="sb/trips/:id" element={<SbTripDetailRoute />} />
        <Route path="r/sb-trips" element={<Navigate to="/sb/trips?tab=all" replace />} />
        <Route
          path="r/sb-trips/:id"
          element={<SbTripDetailRedirect />}
        />
        <Route path="sb/fees" element={<SbFees />} />
        <Route path="sb/notifications" element={<SbNotifications />} />
        <Route path="sb/attendance" element={<SbAttendancePage />} />
        <Route path="sb/schedule" element={<SbSchedulePage />} />
        <Route path="r/:slug" element={<ResourceListRoute />} />
        <Route path="r/:slug/:id" element={<ResourceDetailRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
