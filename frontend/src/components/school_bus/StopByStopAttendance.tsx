import { useMemo, useState } from "react";
import type { SbDriverChecklistRow } from "@/hooks/useSchoolBus";
import { StudentMarkCard, type AbsentReason } from "./StudentMarkCard";

export interface StopGroup {
  key: string;
  sequence: number;
  stopName: string;
  students: SbDriverChecklistRow[];
}

export function groupChecklistByStop(rows: SbDriverChecklistRow[]): StopGroup[] {
  const map = new Map<string, StopGroup>();
  for (const row of rows) {
    const key = `${row.sequence}::${row.stop_name}`;
    const existing = map.get(key);
    if (existing) {
      existing.students.push(row);
    } else {
      map.set(key, {
        key,
        sequence: row.sequence,
        stopName: row.stop_name || "Unassigned stop",
        students: [row],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.sequence - b.sequence || a.stopName.localeCompare(b.stopName));
}

function stopFullyMarked(students: SbDriverChecklistRow[]) {
  return students.every((s) => s.pickup_status !== "not_marked");
}

export function StopByStopAttendance({
  checklist,
  canMark,
  disabled,
  onMarkPickup,
  onCompleteTrip,
  completePending,
}: {
  checklist: SbDriverChecklistRow[];
  canMark: boolean;
  disabled?: boolean;
  onMarkPickup: (studentId: number, status: "present" | "absent", reason?: AbsentReason) => void;
  onCompleteTrip: () => void;
  completePending?: boolean;
}) {
  const stops = useMemo(() => groupChecklistByStop(checklist), [checklist]);
  const [stopIndex, setStopIndex] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const current = stops[stopIndex];
  const allMarked = checklist.length > 0 && checklist.every((s) => s.pickup_status !== "not_marked");
  const isLastStop = stopIndex >= stops.length - 1;
  const currentDone = current ? stopFullyMarked(current.students) : false;

  const goNextStop = () => {
    if (!isLastStop) {
      setStopIndex((i) => i + 1);
    }
  };

  const handleComplete = () => {
    setCelebrating(true);
    onCompleteTrip();
  };

  if (checklist.length === 0) {
    return <p className="muted">No students on this route.</p>;
  }

  if (celebrating || (allMarked && !canMark)) {
    return (
      <div className="sb-trip-complete" role="status">
        <div className="sb-trip-complete-icon" aria-hidden>
          ✓
        </div>
        <h2>Trip complete</h2>
        <p className="muted">All students marked. Great job!</p>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="sb-stop-attendance">
      <div className="sb-stop-nav">
        <button
          type="button"
          className="sb-stop-nav-btn"
          disabled={stopIndex === 0}
          onClick={() => setStopIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous stop"
        >
          ←
        </button>
        <div className="sb-stop-nav-label">
          <span className="sb-stop-nav-title">Stop {stopIndex + 1} of {stops.length}</span>
          <strong>{current.stopName}</strong>
        </div>
        <button
          type="button"
          className="sb-stop-nav-btn"
          disabled={isLastStop}
          onClick={() => setStopIndex((i) => Math.min(stops.length - 1, i + 1))}
          aria-label="Next stop"
        >
          →
        </button>
      </div>

      <div className="sb-stop-students">
        {current.students.map((row) => (
          <StudentMarkCard
            key={row.student_id}
            name={row.full_name}
            pickupStatus={row.pickup_status}
            disabled={disabled || !canMark}
            onMarkPresent={() => onMarkPickup(row.student_id, "present")}
            onMarkAbsent={(reason) => onMarkPickup(row.student_id, "absent", reason)}
          />
        ))}
      </div>

      <div className="sb-stop-footer">
        {canMark && currentDone && !isLastStop && (
          <button type="button" className="sb-driver-btn sb-driver-btn-primary sb-stop-next" onClick={goNextStop}>
            Next stop
          </button>
        )}
        {canMark && allMarked && (
          <button
            type="button"
            className="sb-driver-btn sb-driver-btn-primary sb-stop-next"
            disabled={completePending}
            onClick={handleComplete}
          >
            Complete trip
          </button>
        )}
      </div>
    </div>
  );
}
