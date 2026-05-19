import { Link } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useSbDriverToday } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function SbDriverToday() {
  const { logout } = useAuth();
  const { data, isLoading, error } = useSbDriverToday();
  useDocumentTitle("Driver — Today");

  if (isLoading) {
    return (
      <div className="sb-driver-page">
        <header className="sb-driver-header">
          <h1>Today&apos;s route</h1>
          <p className="muted">Loading…</p>
        </header>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="sb-driver-page">
        <p className="error">{apiErrorMessage(error, "Could not load today's trip.")}</p>
        {isAuthError(error) && (
          <p>
            <Link to="/login">Sign in again</Link>
          </p>
        )}
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="sb-driver-page">
      <header className="sb-driver-header">
        <div>
          <h1>{data.route.name}</h1>
          <p className="muted">
            {data.route.direction} · Bus {data.bus.fleet_number} · {data.trip_date}
          </p>
        </div>
        <span className={`sb-trip-chip sb-trip-chip--${data.trip_status}`}>
          {statusLabel(data.trip_status)}
        </span>
      </header>

      <div className="sb-driver-actions">
        <Link className="sb-driver-btn sb-driver-btn-primary" to={`/sb/driver/trip/${data.trip_id}`}>
          Open trip checklist
        </Link>
        <Link className="sb-driver-btn" to="/sb/driver/incident">
          Report incident
        </Link>
      </div>

      <section className="sb-driver-section">
        <h2>Students ({data.checklist.length})</h2>
        <ul className="sb-driver-checklist">
          {data.checklist.map((row) => (
            <li key={row.student_id} className="sb-driver-checklist-item">
              <div>
                <strong>{row.full_name}</strong>
                <span className="muted"> · {row.stop_name}</span>
              </div>
              <span className="sb-attendance-badge">{row.pickup_status.replace(/_/g, " ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" className="sb-driver-signout" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}
