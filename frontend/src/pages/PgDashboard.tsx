import { Link } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { CommandTile } from "@/components/pg/CommandTile";
import { pgQuickActions } from "@/config/pgQuickActions";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePgDashboard } from "@/hooks/useResource";

function CommandTileSkeleton({ sm }: { sm?: boolean }) {
  return (
    <div
      className={`command-tile command-tile-skeleton${sm ? " command-tile-sm" : " command-tile-lg"}`}
      aria-hidden
    />
  );
}

export function PgDashboard() {
  const { tenantSlug } = useAuth();
  const { data, isLoading, error } = usePgDashboard();
  useDocumentTitle(`Command center — ${tenantSlug} | SaaSStack`);

  if (isLoading) {
    return (
      <div className="pg-dashboard">
        <header className="dashboard-header page-title-block">
          <h1>Command center</h1>
          <p className="muted">Loading your property overview…</p>
        </header>
        <div className="command-center-grid command-center-grid-primary">
          {Array.from({ length: 5 }).map((_, i) => (
            <CommandTileSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p className="error">{apiErrorMessage(error, "Could not load dashboard.")}</p>
        {isAuthError(error) && (
          <p>
            <Link to="/login">Sign in again</Link>
          </p>
        )}
      </div>
    );
  }

  const trends = data?.trends ?? {};
  const occupancy = data?.occupancy_rate ?? 0;
  const pendingBookings = data?.pending_bookings ?? 0;
  const rentOverdue = data?.rent_overdue ?? 0;
  const openComplaints = data?.open_complaints ?? 0;
  const quickActions = pgQuickActions(tenantSlug);

  const allClear =
    pendingBookings === 0 && rentOverdue === 0 && openComplaints === 0 && (data?.rent_due_unpaid ?? 0) === 0;

  return (
    <div className="pg-dashboard">
      <header className="dashboard-header page-title-block">
        <h1>Command center</h1>
        <p className="muted">Today at a glance</p>
        {data?.as_of && <p className="muted dashboard-as-of">As of {data.as_of}</p>}
      </header>

      <div className="dashboard-quick-actions" role="toolbar" aria-label="Quick actions">
        {quickActions.map((a) =>
          a.external ? (
            <a key={a.label} href={a.to} className="secondary" target="_blank" rel="noreferrer">
              {a.label}
            </a>
          ) : (
            <Link key={a.label} to={a.to} className="secondary">
              {a.label}
            </Link>
          )
        )}
      </div>

      <section className="command-center" aria-label="Key metrics">
        <div className="command-center-grid command-center-grid-primary">
          <CommandTile
            to="/r/pg-rooms"
            value={`${occupancy}%`}
            label="Occupancy"
            trend={trends.occupancy_rate}
          />
          <CommandTile
            to="/r/pg-rooms?room_status=available"
            value={data?.rooms_available ?? 0}
            label="Available rooms"
          />
          <CommandTile
            to="/r/pg-booking-requests?status=pending"
            value={pendingBookings}
            label="Pending bookings"
            highlight={pendingBookings > 0}
            trend={trends.pending_bookings}
          />
          <CommandTile
            to="/r/pg-rent-records?overdue=true"
            value={rentOverdue}
            label="Overdue rent"
            highlight={rentOverdue > 0}
            trend={trends.rent_overdue}
          />
          <CommandTile
            to="/r/pg-complaints?status=open"
            value={openComplaints}
            label="Open complaints"
            highlight={openComplaints > 0}
            trend={trends.open_complaints}
          />
        </div>

        <div className="command-center-grid command-center-grid-secondary">
          <CommandTile
            size="sm"
            to="/r/pg-residents?active_status=active"
            value={data?.active_residents ?? 0}
            label="Active residents"
          />
          <CommandTile
            size="sm"
            to="/r/pg-rent-records?paid_status=unpaid"
            value={data?.rent_due_unpaid ?? 0}
            label="Unpaid rent"
          />
          <CommandTile
            size="sm"
            to="/r/pg-rooms?room_status=occupied"
            value={data?.occupied_rooms ?? 0}
            label="Occupied rooms"
          />
          <CommandTile
            size="sm"
            to="/r/pg-rooms?full=1"
            value={data?.rooms_full ?? 0}
            label="Full"
          />
          <CommandTile
            size="sm"
            to="/r/pg-rooms?room_status=maintenance"
            value={data?.rooms_maintenance ?? 0}
            label="Maintenance"
          />
        </div>

        {allClear && (
          <p className="dashboard-all-clear muted">
            All clear — your property is running smoothly.
          </p>
        )}
      </section>

      {(rentOverdue > 0 || openComplaints > 0 || pendingBookings > 0) && (
        <section className="dashboard-alerts" aria-label="Attention needed">
          {pendingBookings > 0 && (
            <Link
              to="/r/pg-booking-requests?status=pending"
              className="dashboard-cta dashboard-cta-warning"
            >
              Review {pendingBookings} pending booking{pendingBookings === 1 ? "" : "s"}
            </Link>
          )}
          {rentOverdue > 0 && (
            <Link to="/r/pg-rent-records?overdue=true" className="dashboard-cta dashboard-cta-danger">
              Collect {rentOverdue} overdue rent {rentOverdue === 1 ? "record" : "records"}
            </Link>
          )}
          {openComplaints > 0 && (
            <Link to="/r/pg-complaints?status=open" className="dashboard-cta dashboard-cta-warning">
              Resolve {openComplaints} open {openComplaints === 1 ? "complaint" : "complaints"}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
