import { useState } from "react";

export type AbsentReason = "sick" | "holiday" | "no_info";

const ABSENT_REASONS: { value: AbsentReason; label: string }[] = [
  { value: "sick", label: "Sick" },
  { value: "holiday", label: "Holiday" },
  { value: "no_info", label: "No info" },
];

export function StudentMarkCard({
  name,
  stopName,
  pickupStatus,
  disabled,
  onMarkAbsent,
  onReset,
}: {
  name: string;
  stopName?: string;
  pickupStatus: string;
  disabled?: boolean;
  onMarkAbsent: (reason: AbsentReason) => void;
  onReset?: () => void;
}) {
  const [showReasons, setShowReasons] = useState(false);
  const isAbsent = pickupStatus === "absent";

  return (
    <div className="sb-student-mark-card sb-student-mark-card--row">
      <div className="sb-student-mark-info">
        <strong>{name}</strong>
        {stopName ? <div className="muted">{stopName}</div> : null}
      </div>
      <div className="sb-student-mark-actions-col">
        {isAbsent ? (
          <button
            type="button"
            className="sb-mark-status sb-mark-status--absent"
            disabled={disabled || !onReset}
            onClick={() => {
              setShowReasons(false);
              onReset?.();
            }}
            title="Tap to undo"
          >
            Absent
          </button>
        ) : (
          <button
            type="button"
            className="sb-mark-absent-btn"
            disabled={disabled}
            onClick={() => setShowReasons((v) => !v)}
          >
            Mark absent
          </button>
        )}
      </div>
      {showReasons && !isAbsent && (
        <div className="sb-absent-reasons" role="group" aria-label="Absent reason">
          {ABSENT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              className="sb-reason-chip"
              disabled={disabled}
              onClick={() => {
                setShowReasons(false);
                onMarkAbsent(r.value);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
