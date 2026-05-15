import { Link } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { usePgDashboard } from "@/hooks/useResource";

export function PgDashboard() {
  const { data, isLoading, error } = usePgDashboard();

  if (isLoading) return <p>Loading dashboard…</p>;
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
  const asOf = data?.as_of;

  return (
    <div className="pg-dashboard">
      <header className="dashboard-header">
        <h1>PG Management</h1>
        <p className="muted">Operational overview for your property</p>
        {asOf && <p className="muted dashboard-as-of">As of {asOf}</p>}
      </header>

      <section className="dashboard-hero">
        <Link to="/r/pg-rooms" className="hero-card">
          <span className="hero-value">{occupancy}%</span>
          <span className="hero-label">Occupancy</span>
          <span className="muted hero-sub">
            {data?.occupied_rooms ?? 0} of {data?.total_rooms ?? 0} rooms occupied
          </span>
        </Link>
        <Link to="/r/pg-residents?active_status=active" className="hero-card">
          <span className="hero-value">{activeResidents}</span>
          <span className="hero-label">Active residents</span>
        </Link>
      </section>

      {(rentOverdue > 0 || openComplaints > 0) && (
        <section className="dashboard-alerts" aria-label="Attention needed">
          {rentOverdue > 0 && (
            <Link to="/r/pg-rent-records?overdue=true" className="alert-card alert-danger">
              <strong>{rentOverdue}</strong> overdue rent {rentOverdue === 1 ? "record" : "records"} — review now
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

      <section className="dashboard-metrics">
        <h2 className="section-title">Quick metrics</h2>
        <div className="dashboard-grid">
          <Link to="/r/pg-rent-records?paid_status=unpaid" className="stat-card">
            <span className="stat-value">{rentUnpaid}</span>
            <span className="stat-label">Unpaid rent</span>
          </Link>
          <Link to="/r/pg-rent-records?overdue=true" className="stat-card">
            <span className={`stat-value${rentOverdue > 0 ? " stat-warn" : ""}`}>{rentOverdue}</span>
            <span className="stat-label">Overdue rent</span>
          </Link>
          <Link to="/r/pg-complaints?status=open" className="stat-card">
            <span className={`stat-value${openComplaints > 0 ? " stat-warn" : ""}`}>
              {openComplaints}
            </span>
            <span className="stat-label">Open complaints</span>
          </Link>
          <Link to="/r/pg-rooms?room_status=occupied" className="stat-card">
            <span className="stat-value">{data?.occupied_rooms ?? 0}</span>
            <span className="stat-label">Occupied rooms</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
