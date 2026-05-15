import { Link } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { usePgDashboard } from "@/hooks/useResource";

const STAT_CARDS: { key: string; label: string; href: string; suffix?: string }[] = [
  { key: "active_residents", label: "Active residents", href: "/r/pg-residents" },
  { key: "total_rooms", label: "Total rooms", href: "/r/pg-rooms" },
  { key: "occupied_rooms", label: "Occupied rooms", href: "/r/pg-rooms" },
  { key: "occupancy_rate", label: "Occupancy", href: "/r/pg-rooms", suffix: "%" },
  { key: "open_complaints", label: "Open complaints", href: "/r/pg-complaints" },
  { key: "rent_due_unpaid", label: "Unpaid rent", href: "/r/pg-rent-records" },
  { key: "rent_overdue", label: "Overdue rent", href: "/r/pg-rent-records" },
];

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

  return (
    <div>
      <h1>PG Management</h1>
      <p className="muted">Overview for your property</p>
      <div className="dashboard-grid">
        {STAT_CARDS.map(({ key, label, href, suffix }) => (
          <Link key={key} to={href} className="stat-card">
            <span className="stat-value">
              {data?.[key] ?? 0}
              {suffix ?? ""}
            </span>
            <span className="stat-label">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
