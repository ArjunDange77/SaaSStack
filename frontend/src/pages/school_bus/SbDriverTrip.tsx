import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
import { StopByStopAttendance } from "@/components/school_bus/StopByStopAttendance";
import type { AbsentReason } from "@/components/school_bus/StudentMarkCard";
import { useSbDriverToday, useSbTripActions } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function SbDriverTrip() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const { data, isLoading, error, refetch } = useSbDriverToday();
  const { start, attendance, complete } = useSbTripActions(tripId);
  const [actionError, setActionError] = useState("");
  const [gpsOn, setGpsOn] = useState(false);
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

  const canStart = data.trip_status === "scheduled" || data.trip_status === "delayed";
  const canMark = ["started", "pickup_in_progress", "incident_reported"].includes(data.trip_status);
  const elapsedMins = data.started_at
    ? Math.max(0, Math.floor((Date.now() - new Date(data.started_at).getTime()) / 60000))
    : 0;

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

  const onMarkPickup = async (studentId: number, status: "present" | "absent", reason?: AbsentReason) => {
    setActionError("");
    try {
      await attendance.mutateAsync([
        {
          student_id: studentId,
          pickup_status: status,
          pickup_absent_reason: reason,
        },
      ]);
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
          <h1>{data.route.name}</h1>
          <p className="muted">
            {data.bus.fleet_number} · {elapsedMins > 0 ? `${elapsedMins} min elapsed` : data.trip_date}
          </p>
        </div>
        <span className={`sb-trip-chip sb-trip-chip--${data.trip_status}`}>
          {data.trip_status.replace(/_/g, " ")}
        </span>
      </header>

      <div className="sb-gps-pills">
        <button
          type="button"
          className={`sb-gps-pill ${gpsOn ? "sb-gps-pill--on" : ""}`}
          onClick={() => setGpsOn(!gpsOn)}
        >
          {gpsOn ? "Sharing live" : "Location off"}
        </button>
      </div>

      {actionError && <p className="error">{actionError}</p>}

      {canStart && (
        <button
          type="button"
          className="sb-driver-btn sb-driver-btn-primary sb-start-trip"
          disabled={start.isPending}
          onClick={onStart}
        >
          Start trip
        </button>
      )}

      <StopByStopAttendance
        checklist={data.checklist}
        canMark={canMark}
        disabled={attendance.isPending}
        onMarkPickup={onMarkPickup}
        onCompleteTrip={onComplete}
        completePending={complete.isPending}
      />

      <Link to="/sb/driver/incident" className="sb-incident-fab" aria-label="Report incident">
        !
      </Link>
    </div>
  );
}
