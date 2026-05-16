interface Props {
  current: "rooms" | "form" | "done";
}

const STEPS = [
  { id: "rooms" as const, label: "Choose room" },
  { id: "form" as const, label: "Your details" },
  { id: "done" as const, label: "Done" },
];

export function BookingStepIndicator({ current }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

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
