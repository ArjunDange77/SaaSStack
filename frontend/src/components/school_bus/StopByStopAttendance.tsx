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

function stopAbsentCount(students: SbDriverChecklistRow[]) {
  return students.filter((s) => s.pickup_status === "absent").length;
}

export function StopByStopAttendance({
  checklist,
  canMark,
  disabled,
  onMarkPickup,
  onCompleteTrip,
  completePending,
  stickyFinish = false,
}: {
  checklist: SbDriverChecklistRow[];
  canMark: boolean;
  disabled?: boolean;
  onMarkPickup: (
    studentId: number,
    status: "present" | "absent" | "not_marked",
    reason?: AbsentReason
  ) => void;
  onCompleteTrip?: () => void;
  completePending?: boolean;
  stickyFinish?: boolean;
}) {
  const stops = useMemo(() => groupChecklistByStop(checklist), [checklist]);
  const [stopIndex, setStopIndex] = useState(0);

  const current = stops[stopIndex];
  const isLastStop = stopIndex >= stops.length - 1;
  const absentCount = current ? stopAbsentCount(current.students) : 0;
  const currentTotal = current?.students.length ?? 0;
  const onBusCount = currentTotal - absentCount;

  const goNextStop = () => {
    if (!isLastStop) {
      setStopIndex((i) => i + 1);
    }
  };

  if (checklist.length === 0) {
    return <p className="muted">No students on this route.</p>;
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
          <span className="sb-stop-nav-title">
            Stop {stopIndex + 1} of {stops.length} · {onBusCount} on bus
            {absentCount > 0 ? ` · ${absentCount} absent` : ""}
          </span>
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
            onMarkAbsent={(reason) => onMarkPickup(row.student_id, "absent", reason)}
            onReset={() => onMarkPickup(row.student_id, "not_marked")}
          />
        ))}
      </div>

      {!stickyFinish && (
        <div className="sb-stop-footer">
          {canMark && !isLastStop && (
            <button type="button" className="sb-driver-btn sb-driver-btn-primary sb-stop-next" onClick={goNextStop}>
              Next stop
            </button>
          )}
          {canMark && onCompleteTrip && (
            <button
              type="button"
              className="sb-driver-btn sb-driver-btn-primary sb-stop-next"
              disabled={completePending}
              onClick={onCompleteTrip}
            >
              Complete trip
            </button>
          )}
        </div>
      )}

      {stickyFinish && canMark && !isLastStop && (
        <button type="button" className="sb-driver-btn sb-stop-next" onClick={goNextStop}>
          Next stop
        </button>
      )}
    </div>
  );
}
