import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
import { useSbDriverToday, useSbTripActions } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function SbDriverTrip() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const { data, isLoading, error, refetch } = useSbDriverToday();
  const { start, attendance, complete } = useSbTripActions(tripId);
  const [actionError, setActionError] = useState("");
  useDocumentTitle("Driver — Trip");

  if (isLoading || !data) {
    return (
      <div className="sb-driver-page">
        <p className="muted">Loading trip…</p>
      </div>
    );
  }

  if (error || data.trip_id !== tripId) {
    return (
      <div className="sb-driver-page">
        <p className="error">{apiErrorMessage(error, "Trip not found.")}</p>
        <Link to="/sb/driver">Back to today</Link>
      </div>
    );
  }

  const canStart = data.trip_status === "scheduled";
  const canMark = ["started", "pickup_in_progress", "incident_reported"].includes(data.trip_status);
  const canComplete = ["pickup_in_progress", "started", "incident_reported"].includes(data.trip_status);

  const onStart = async () => {
    setActionError("");
    try {
      await start.mutateAsync();
      await refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not start trip."));
    }
  };

  const onComplete = async () => {
    setActionError("");
    try {
      await complete.mutateAsync();
      await refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not complete trip."));
    }
  };

  const markPickup = async (studentId: number, status: "present" | "absent") => {
    setActionError("");
    try {
      await attendance.mutateAsync([{ student_id: studentId, pickup_status: status }]);
      await refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not save attendance."));
    }
  };

  return (
    <div className="sb-driver-page">
      <p>
        <Link to="/sb/driver">← Today</Link>
      </p>
      <header className="sb-driver-header">
        <div>
          <h1>Trip checklist</h1>
          <p className="muted">{data.route.name}</p>
        </div>
        <span className={`sb-trip-chip sb-trip-chip--${data.trip_status}`}>{data.trip_status}</span>
      </header>

      {actionError && <p className="error">{actionError}</p>}

      <div className="sb-driver-actions">
        {canStart && (
          <button
            type="button"
            className="sb-driver-btn sb-driver-btn-primary"
            disabled={start.isPending}
            onClick={onStart}
          >
            Start trip
          </button>
        )}
        {canComplete && (
          <button
            type="button"
            className="sb-driver-btn"
            disabled={complete.isPending}
            onClick={onComplete}
          >
            Complete trip
          </button>
        )}
      </div>

      <ul className="sb-driver-checklist">
        {data.checklist.map((row) => (
          <li key={row.student_id} className="sb-driver-checklist-item sb-driver-checklist-item--actions">
            <div>
              <strong>{row.full_name}</strong>
              <div className="muted">{row.stop_name}</div>
            </div>
            {canMark ? (
              <div className="sb-attendance-actions">
                <button
                  type="button"
                  className="sb-driver-btn sb-driver-btn-sm"
                  disabled={attendance.isPending}
                  onClick={() => markPickup(row.student_id, "present")}
                >
                  Present
                </button>
                <button
                  type="button"
                  className="sb-driver-btn sb-driver-btn-sm sb-driver-btn-muted"
                  disabled={attendance.isPending}
                  onClick={() => markPickup(row.student_id, "absent")}
                >
                  Absent
                </button>
              </div>
            ) : (
              <span className="sb-attendance-badge">{row.pickup_status.replace(/_/g, " ")}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
