import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useSbDriverToday, useSbTripActions } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function statusLabel(status: string | null): string {
  if (!status) return "";
  return status.replace(/_/g, " ");
}

export function SbDriverToday() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSbDriverToday();
  const tripId = data?.trip_id ?? 0;
  const { start } = useSbTripActions(tripId);
  const [actionError, setActionError] = useState("");
  useDocumentTitle("Driver — Today");

  const onStartTrip = async () => {
    if (!data?.trip_id) return;
    setActionError("");
    try {
      await start.mutateAsync();
      await refetch();
      navigate(`/sb/driver/trip/${data.trip_id}`);
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not start trip."));
    }
  };

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

  const isScheduled =
    data.trip_status === "scheduled" || data.trip_status === "delayed";
  const hasActiveTrip = data.trip_id != null;
  const canOpen = data.can_open_checklist && hasActiveTrip;

  if (!hasActiveTrip) {
    return (
      <div className="sb-driver-page">
        <header className="sb-driver-header">
          <h1>Today&apos;s route</h1>
          <p className="muted">{data.driver_name}</p>
          {data.route_name ? <p className="muted">Assigned route: {data.route_name}</p> : null}
        </header>
        <section className="sb-driver-empty">
          <p>No trip scheduled for today.</p>
          <p className="muted">Check back tomorrow or contact your operator.</p>
        </section>
        <button type="button" className="sb-driver-signout" onClick={logout}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="sb-driver-page">
      <header className="sb-driver-header">
        <div>
          <h1>{data.route.name || data.route_name}</h1>
          <p className="muted">
            {data.route.direction} · Bus {data.bus.fleet_number || data.bus_fleet_number} ·{" "}
            {data.trip_date}
          </p>
        </div>
        <span className={`sb-trip-chip sb-trip-chip--${data.trip_status}`}>
          {statusLabel(data.trip_status)}
        </span>
      </header>

      {actionError && <p className="error">{actionError}</p>}

      <div className="sb-driver-actions">
        {isScheduled && (
          <button
            type="button"
            className="sb-driver-btn sb-driver-btn-primary sb-start-trip"
            disabled={start.isPending}
            onClick={onStartTrip}
          >
            Start trip
          </button>
        )}
        {canOpen && (
          <Link className="sb-driver-btn sb-driver-btn-primary" to={`/sb/driver/trip/${data.trip_id}`}>
            Open trip checklist
          </Link>
        )}
        <Link className="sb-driver-btn" to="/sb/driver/incident">
          Report incident
        </Link>
      </div>

      {canOpen && data.checklist.length > 0 && (
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
      )}

      {isScheduled && (
        <p className="muted sb-driver-hint">Start the trip to begin marking attendance at each stop.</p>
      )}

      <button type="button" className="sb-driver-signout" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}
