import { Link } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { CommandTile } from "@/components/pg/CommandTile";
import { usePgDashboard } from "@/hooks/useResource";

function CommandTileSkeleton() {
  return <div className="command-tile command-tile-skeleton" aria-hidden />;
}

export function PgDashboard() {
  const { data, isLoading, error } = usePgDashboard();

  if (isLoading) {
    return (
      <div className="pg-dashboard">
        <header className="dashboard-header page-title-block">
          <h1>Command center</h1>
          <p className="muted">Loading your property overview…</p>
        </header>
        <div className="command-center-grid">
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

  const occupancy = data?.occupancy_rate ?? 0;
  const activeResidents = data?.active_residents ?? 0;
  const rentOverdue = data?.rent_overdue ?? 0;
  const rentUnpaid = data?.rent_due_unpaid ?? 0;
  const openComplaints = data?.open_complaints ?? 0;
  const pendingBookings = data?.pending_bookings ?? 0;
  const roomsAvailable = data?.rooms_available ?? 0;
  const roomsFull = data?.rooms_full ?? 0;
  const roomsMaintenance = data?.rooms_maintenance ?? 0;
  const asOf = data?.as_of;

  const allClear =
    pendingBookings === 0 &&
    rentOverdue === 0 &&
    openComplaints === 0 &&
    rentUnpaid === 0;

  return (
    <div className="pg-dashboard">
      <header className="dashboard-header page-title-block">
        <h1>Command center</h1>
        <p className="muted">Today at a glance</p>
        {asOf && <p className="muted dashboard-as-of">As of {asOf}</p>}
      </header>

      <section className="command-center" aria-label="Key metrics">
        <div className="command-center-grid">
          <CommandTile
            to="/r/pg-rooms"
            value={`${occupancy}%`}
            label="Occupancy"
          />
          <CommandTile
            to="/r/pg-rooms?room_status=available"
            value={roomsAvailable}
            label="Available rooms"
          />
          <CommandTile
            to="/r/pg-booking-requests?status=pending"
            value={pendingBookings}
            label="Pending bookings"
            highlight={pendingBookings > 0}
          />
          <CommandTile
            to="/r/pg-rent-records?overdue=true"
            value={rentOverdue}
            label="Overdue rent"
            highlight={rentOverdue > 0}
          />
          <CommandTile
            to="/r/pg-complaints?status=open"
            value={openComplaints}
            label="Open complaints"
            highlight={openComplaints > 0}
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
            <Link to="/r/pg-booking-requests?status=pending" className="alert-card alert-warning">
              <strong>{pendingBookings}</strong> pending booking{" "}
              {pendingBookings === 1 ? "request" : "requests"} — review now
            </Link>
          )}
          {rentOverdue > 0 && (
            <Link to="/r/pg-rent-records?overdue=true" className="alert-card alert-danger">
              <strong>{rentOverdue}</strong> overdue rent {rentOverdue === 1 ? "record" : "records"}{" "}
              — collect now
            </Link>
          )}
          {openComplaints > 0 && (
            <Link to="/r/pg-complaints?status=open" className="alert-card alert-warning">
              <strong>{openComplaints}</strong> open{" "}
              {openComplaints === 1 ? "complaint" : "complaints"} — resolve
            </Link>
          )}
        </section>
      )}

      <section className="dashboard-secondary">
        <h2 className="section-title">More detail</h2>
        <div className="dashboard-grid">
          <Link to="/r/pg-residents?active_status=active" className="stat-card">
            <span className="stat-value">{activeResidents}</span>
            <span className="stat-label">Active residents</span>
          </Link>
          <Link to="/r/pg-rent-records?paid_status=unpaid" className="stat-card">
            <span className="stat-value">{rentUnpaid}</span>
            <span className="stat-label">Unpaid rent</span>
          </Link>
          <Link to="/r/pg-rooms?room_status=occupied" className="stat-card">
            <span className="stat-value">{data?.occupied_rooms ?? 0}</span>
            <span className="stat-label">Occupied rooms</span>
          </Link>
          <Link to="/r/pg-rooms?full=1" className="stat-card">
            <span className="stat-value">{roomsFull}</span>
            <span className="stat-label">Full</span>
          </Link>
          <Link to="/r/pg-rooms?room_status=maintenance" className="stat-card">
            <span className="stat-value">{roomsMaintenance}</span>
            <span className="stat-label">Maintenance</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
