interface Props {
  current: "rooms" | "form" | "done";
  variant?: "default" | "compact" | "mock";
}

const STEPS = [
  { id: "rooms" as const, label: "Choose room", mockLabel: "Room" },
  { id: "form" as const, label: "Your details", mockLabel: "Your details" },
  { id: "done" as const, label: "Done", mockLabel: "Done" },
];

const COMPACT_LABELS = ["Room", "Details", "Done"];

export function BookingStepIndicator({ current, variant = "default" }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  if (variant === "compact") {
    return (
      <div className="steps steps-compact" aria-label="Booking progress">
        {COMPACT_LABELS.map((label, i) => (
          <div key={label} className="steps-compact-row">
            <span
              className={`s-item ${
                i < currentIdx ? "s-done" : i === currentIdx ? "s-active" : "s-inactive"
              }`}
            >
              <span className="s-circle">{i < currentIdx ? "✓" : i + 1}</span>
              <span className="s-label">{label}</span>
            </span>
            {i < COMPACT_LABELS.length - 1 && <span className="s-line" aria-hidden />}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "mock") {
    return (
      <div className="booking-steps-mock" aria-label="Booking progress">
        <div className="steps">
          {STEPS.map((step, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={step.id} className="steps-mock-item-wrap">
                <div
                  className={`s-item ${done ? "s-done" : active ? "s-active" : "s-inactive"}`}
                >
                  <span className="s-circle">{done ? "✓" : i + 1}</span>
                  <span className="s-label">{step.mockLabel}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <span className={`s-line${done ? " done" : ""}`} aria-hidden />
                )}
              </div>
            );
          })}
        </div>
        {current === "form" && (
          <p className="eta">~1 min remaining</p>
        )}
      </div>
    );
  }

  return (
    <div className="booking-steps-wrap">
      <ol className="step-bar" aria-label="Booking progress">
        {STEPS.map((step, i) => {
          let state: "done" | "active" | "inactive" = "inactive";
          if (i < currentIdx) state = "done";
          else if (i === currentIdx) state = "active";
          return (
            <li key={step.id} className={`step-bar-item ${state}`}>
              <span className="step-num">{i + 1}</span>
              <span className="step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
      <p className="muted booking-steps-duration">~2 min to complete</p>
    </div>
  );
}
