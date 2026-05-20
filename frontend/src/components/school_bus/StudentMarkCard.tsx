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
  onMarkPresent,
  onMarkAbsent,
}: {
  name: string;
  stopName?: string;
  pickupStatus: string;
  disabled?: boolean;
  onMarkPresent: () => void;
  onMarkAbsent: (reason: AbsentReason) => void;
}) {
  const [showReasons, setShowReasons] = useState(false);
  const marked = pickupStatus !== "not_marked";

  return (
    <div className="sb-student-mark-card">
      <div className="sb-student-mark-info">
        <strong>{name}</strong>
        {stopName ? <div className="muted">{stopName}</div> : null}
      </div>
      {marked ? (
        <span className={`sb-mark-status sb-mark-status--${pickupStatus}`}>
          {pickupStatus.replace(/_/g, " ")}
        </span>
      ) : (
        <div className="sb-mark-actions">
          <button
            type="button"
            className="sb-mark-btn sb-mark-btn--present"
            disabled={disabled}
            onClick={onMarkPresent}
          >
            Present
          </button>
          <button
            type="button"
            className="sb-mark-btn sb-mark-btn--absent"
            disabled={disabled}
            onClick={() => setShowReasons((v) => !v)}
          >
            Absent
          </button>
        </div>
      )}
      {showReasons && !marked && (
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
