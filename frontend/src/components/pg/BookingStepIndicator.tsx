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
    <ol className="booking-steps" aria-label="Booking progress">
      {STEPS.map((step, i) => (
        <li
          key={step.id}
          className={`booking-step${i <= currentIdx ? " active" : ""}${i === currentIdx ? " current" : ""}`}
        >
          <span className="booking-step-num">{i + 1}</span>
          <span className="booking-step-label">{step.label}</span>
        </li>
      ))}
    </ol>
    <p className="muted booking-steps-duration">~2 min to complete</p>
    </div>
  );
}
