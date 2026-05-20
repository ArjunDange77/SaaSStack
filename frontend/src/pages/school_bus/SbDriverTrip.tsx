import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LiveBusMap } from "@/components/school_bus/LiveBusMap";
import { StopByStopAttendance } from "@/components/school_bus/StopByStopAttendance";
import type { AbsentReason } from "@/components/school_bus/StudentMarkCard";
import { useSbDriverLocationShare } from "@/hooks/useSbDriverLocationShare";
import { useSbDriverToday, useSbTripActions, type SbTripSummary } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const ELAPSED_CAP_MS = 8 * 60 * 60 * 1000;

function tripElapsedMinutes(startedAt: string | null, completedAt: string | null): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  const end = completedAt
    ? new Date(completedAt).getTime()
    : Math.min(Date.now(), start + ELAPSED_CAP_MS);
  return Math.max(0, Math.floor((end - start) / 60000));
}

export function SbDriverTrip() {
  const { data, isLoading, error, refetch } = useSbDriverToday();
  const tripId = data?.trip_id ?? 0;
  const { start, attendance, complete } = useSbTripActions(tripId);
  const [actionError, setActionError] = useState("");
  const [finishSummary, setFinishSummary] = useState<SbTripSummary | null>(null);
  const [showGpsPrompt, setShowGpsPrompt] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  useDocumentTitle("Driver — Trip");

  const tripStatus = data?.trip_status ?? "";
  const canStart = tripStatus === "scheduled" || tripStatus === "delayed";
  const canMark = ["started", "pickup_in_progress", "incident_reported"].includes(tripStatus);
  const tripActive = canMark;
  const { sharing, setSharingEnabled, error: gpsError, lastFix, backgroundHidden } =
    useSbDriverLocationShare(tripId, tripActive);

  const mapLocation = useMemo(() => {
    if (sharing && lastFix) {
      return {
        latitude: String(lastFix.latitude),
        longitude: String(lastFix.longitude),
        recorded_at: lastFix.recordedAt,
      };
    }
    return data?.last_location ?? null;
  }, [sharing, lastFix, data?.last_location]);

  const elapsedMins = useMemo(
    () => tripElapsedMinutes(data?.started_at ?? null, data?.completed_summary?.completed_at ?? null),
    [data?.started_at, data?.completed_summary?.completed_at]
  );
  const absentCount = useMemo(
    () => (data?.checklist ?? []).filter((r) => r.pickup_status === "absent").length,
    [data?.checklist]
  );
  const canFinish = canMark;

  if (isLoading || !data) {
    return (
      <div className="sb-driver-page">
        <p className="muted">Loading trip…</p>
      </div>
    );
  }

  if (error || !data.trip_id) {
    return (
      <div className="sb-driver-page">
        <p className="error">{apiErrorMessage(error, "Trip not found.")}</p>
        <Link to="/sb/driver">Back to today</Link>
      </div>
    );
  }

  const onStart = async () => {
    setActionError("");
    try {
      await start.mutateAsync();
      await refetch();
      setShowGpsPrompt(true);
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not start trip."));
    }
  };

  const onComplete = async () => {
    setActionError("");
    try {
      const result = await complete.mutateAsync();
      setFinishSummary(result.summary ?? data.completed_summary);
      setShowFinishConfirm(false);
      await refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not complete trip."));
      setShowFinishConfirm(false);
    }
  };

  const onMarkPickup = async (
    studentId: number,
    status: "present" | "absent" | "not_marked",
    reason?: AbsentReason
  ) => {
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

  if (finishSummary || (tripStatus === "completed" && data.completed_summary)) {
    const s = finishSummary ?? data.completed_summary!;
    return (
      <div className="sb-driver-page">
        <div className="sb-trip-complete" role="status">
          <div className="sb-trip-complete-icon" aria-hidden>
            ✓
          </div>
          <h2>Trip complete</h2>
          <p>
            {s.present_count} present, {s.absent_count} absent
            {s.duration_minutes != null ? ` · ${s.duration_minutes} min` : ""}
          </p>
          <Link className="sb-driver-btn" to="/sb/driver">
            Back to today
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sb-driver-page sb-driver-page--trip">
      <Breadcrumbs
        crumbs={[
          { label: "Today", to: "/sb/driver" },
          { label: data.route.name || data.route_name },
        ]}
      />
      <header className="sb-driver-header">
        <div>
          <h1>{data.route.name}</h1>
          <p className="muted">
            {data.bus.fleet_number} · {elapsedMins > 0 ? `${elapsedMins} min elapsed` : data.trip_date}
            {data.progress
              ? ` · ${data.progress.total_students} students${absentCount > 0 ? ` · ${absentCount} absent` : ""}`
              : ""}
          </p>
        </div>
        <span className={`sb-trip-chip sb-trip-chip--${tripStatus}`}>
          {tripStatus.replace(/_/g, " ")}
        </span>
      </header>

      {canMark && (
        <Link to="/sb/driver/incident" className="sb-driver-btn sb-incident-report-btn">
          Report incident
        </Link>
      )}

      {showGpsPrompt && !sharing && canMark && (
        <div className="sb-gps-consent" role="dialog" aria-labelledby="gps-consent-title">
          <p id="gps-consent-title">
            <strong>Share location with parents?</strong>
          </p>
          <p className="muted">
            Keep this trip page open while driving. Location updates about every 20 seconds and
            may pause if you lock the phone or switch apps.
          </p>
          <div className="sb-gps-consent-actions">
            <button
              type="button"
              className="sb-driver-btn sb-driver-btn-primary"
              onClick={() => {
                setSharingEnabled(true);
                setShowGpsPrompt(false);
              }}
            >
              Share location
            </button>
            <button
              type="button"
              className="sb-driver-btn"
              onClick={() => setShowGpsPrompt(false)}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <div className="sb-gps-pills">
        <button
          type="button"
          className={`sb-gps-pill ${sharing ? "sb-gps-pill--on" : ""}`}
          onClick={() => setSharingEnabled(!sharing)}
          disabled={!canMark}
        >
          {sharing ? "Live · updates every 20s" : "Location off — tap to enable"}
        </button>
      </div>
      {sharing && (
        <p className="muted sb-gps-hint">
          Parents see the bus on the map. Keep this page open and the screen on for best tracking.
        </p>
      )}
      {sharing && backgroundHidden && (
        <p className="sb-gps-background-banner" role="status">
          Location may pause while this tab is in the background. Return to this page and keep the
          screen on for parents to follow your route.
        </p>
      )}
      {gpsError && <p className="error">{gpsError}</p>}

      {mapLocation && (
        <LiveBusMap
          latitude={mapLocation.latitude}
          longitude={mapLocation.longitude}
          label={data.route.name}
          lastUpdated={mapLocation.recorded_at}
          height={160}
        />
      )}

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
        stickyFinish
        onCompleteTrip={() => setShowFinishConfirm(true)}
        completePending={complete.isPending}
      />

      <div className="sb-driver-sticky-bar">
        {canMark && (
          <>
            <button
              type="button"
              className="sb-driver-btn sb-driver-btn-primary"
              disabled={!canFinish || complete.isPending}
              onClick={() => setShowFinishConfirm(true)}
            >
              Finish trip
            </button>
            <p className="muted sb-finish-hint">
              Students are on the bus unless marked absent.
            </p>
          </>
        )}
      </div>

      <ConfirmDialog
        open={showFinishConfirm}
        title="Finish trip?"
        confirmLabel="Finish trip"
        onConfirm={onComplete}
        onCancel={() => setShowFinishConfirm(false)}
        confirmDisabled={complete.isPending}
      >
        <p>All students are marked. End this trip and share the summary with the operator?</p>
      </ConfirmDialog>
    </div>
  );
}
