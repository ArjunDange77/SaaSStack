import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { useSbDriverSchedule, useSbDriverToday, useSbTripActions } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const ACTIVE_STATUSES = new Set(["started", "pickup_in_progress", "incident_reported"]);

function statusLabel(status: string | null): string {
  if (!status) return "";
  return status.replace(/_/g, " ");
}

export function SbDriverToday() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSbDriverToday();
  const { data: schedule } = useSbDriverSchedule(7);
  const tripId = data?.trip_id ?? 0;
  const { start } = useSbTripActions(tripId);
  const [actionError, setActionError] = useState("");
  const [gpsPrompt, setGpsPrompt] = useState(false);
  useDocumentTitle("Driver — Today");

  const isScheduled =
    data?.trip_status === "scheduled" || data?.trip_status === "delayed";
  const isActive = data?.trip_status != null && ACTIVE_STATUSES.has(data.trip_status);
  const isCompleted = data?.trip_status === "completed";
  const hasActiveTrip = data?.trip_id != null && isActive;

  useEffect(() => {
    if (hasActiveTrip && data?.trip_id) {
      navigate(`/sb/driver/trip/${data.trip_id}`, { replace: true });
    }
  }, [hasActiveTrip, data?.trip_id, navigate]);

  const onStartTrip = async () => {
    if (!data?.trip_id) return;
    setActionError("");
    try {
      await start.mutateAsync();
      await refetch();
      setGpsPrompt(true);
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
        <SignOutButton className="sb-driver-signout-link" />
      </div>
    );
  }

  if (hasActiveTrip && data.trip_id) {
    return <Navigate to={`/sb/driver/trip/${data.trip_id}`} replace />;
  }

  if (!data.trip_id && !isCompleted) {
    const upcoming = schedule?.trips ?? [];
    return (
      <div className="sb-driver-page">
        <Breadcrumbs crumbs={[{ label: "Today" }]} />
        <header className="sb-driver-header">
          <h1>Today&apos;s route</h1>
          <p className="muted">{data.driver_name}</p>
        </header>
        <section className="sb-driver-empty portal-card">
          <p>No trip scheduled for today.</p>
          {upcoming.length > 0 ? (
            <>
              <h2>Upcoming trips</h2>
              <ul className="sb-driver-schedule-list">
                {upcoming.map((t) => (
                  <li key={t.trip_id}>
                    {t.is_today ? (
                      <Link to={`/sb/driver/trip/${t.trip_id}`}>
                        <strong>{t.route_name}</strong> — today · {statusLabel(t.status)}
                      </Link>
                    ) : (
                      <span>
                        <strong>{t.route_name}</strong> — {t.trip_date} · {statusLabel(t.status)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">Check back later or contact your operator.</p>
          )}
        </section>
        <SignOutButton className="sb-driver-signout-link" />
      </div>
    );
  }

  if (isCompleted && data.completed_summary) {
    const s = data.completed_summary;
    return (
      <div className="sb-driver-page">
        <Breadcrumbs crumbs={[{ label: "Today" }]} />
        <header className="sb-driver-header">
          <h1>Trip completed</h1>
          <p className="muted">{data.route.name || data.route_name}</p>
        </header>
        <div className="sb-trip-complete portal-card" role="status">
          <p>
            {s.present_count} present, {s.absent_count} absent
            {s.duration_minutes != null ? ` · ${s.duration_minutes} min` : ""}
          </p>
        </div>
        <SignOutButton className="sb-driver-signout-link" />
      </div>
    );
  }

  return (
    <div className="sb-driver-page">
      <header className="sb-driver-header sb-driver-header--with-menu">
        <div>
          <Breadcrumbs
            crumbs={[
              { label: "Today" },
              { label: data.route.name || data.route_name || "Trip" },
            ]}
          />
          <h1>{data.route.name || data.route_name}</h1>
          <p className="muted">
            {data.route.direction} · Bus {data.bus.fleet_number || data.bus_fleet_number} ·{" "}
            {data.trip_date}
          </p>
        </div>
        <div className="sb-driver-header-actions">
          <span className={`sb-trip-chip sb-trip-chip--${data.trip_status}`}>
            {statusLabel(data.trip_status)}
          </span>
          <SignOutButton className="sb-driver-signout-link" />
        </div>
      </header>

      {actionError && <p className="error">{actionError}</p>}

      {gpsPrompt && (
        <p className="sb-driver-coach muted">
          Mark each student as you reach the stop. Enable location on the trip screen so parents can
          see the bus.
        </p>
      )}

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
        <Link className="sb-driver-btn" to="/sb/driver/incident">
          Report incident
        </Link>
      </div>

      {isScheduled && (
        <p className="muted sb-driver-hint">Start the trip to begin marking attendance at each stop.</p>
      )}
    </div>
  );
}
