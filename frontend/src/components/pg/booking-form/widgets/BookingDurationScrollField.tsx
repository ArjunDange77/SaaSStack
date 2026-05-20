import {
  composeDuration,
  DURATION_QTY_MAX,
  DURATION_QTY_MIN,
  type DurationUnit,
} from "@/lib/publicBookingValidation";
const QTY_OPTIONS = Array.from(
  { length: DURATION_QTY_MAX - DURATION_QTY_MIN + 1 },
  (_, i) => DURATION_QTY_MIN + i
);

interface Props {
  label: string;
  required?: boolean;
  qty: number;
  unit: DurationUnit;
  error?: string;
  onQtyChange: (qty: number) => void;
  onUnitChange: (unit: DurationUnit) => void;
}

export function BookingDurationScrollField({
  label,
  required,
  qty,
  unit,
  error,
  onQtyChange,
  onUnitChange,
}: Props) {
  const badge = composeDuration(qty, unit);

  return (
    <div className="booking-form-field">
      <div className="booking-form-field-label" id="booking-duration-label">
        {label}
        {required && <span className="booking-form-required">*</span>}
      </div>
      <div className="duration-picker-row">
        <label className="sr-only" htmlFor="booking-duration-qty">
          Quantity
        </label>
        <select
          id="booking-duration-qty"
          className={`booking-form-input booking-form-select${error ? " error" : ""}`}
          value={qty}
          aria-invalid={Boolean(error)}
          onChange={(e) => onQtyChange(Number(e.target.value))}
        >
          {QTY_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="booking-duration-unit">
          Unit
        </label>
        <select
          id="booking-duration-unit"
          className={`booking-form-input booking-form-select${error ? " error" : ""}`}
          value={unit}
          aria-invalid={Boolean(error)}
          onChange={(e) => onUnitChange(e.target.value as DurationUnit)}
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </div>
      <span className="duration-badge">{badge}</span>
      {error && (
        <p className="booking-form-field-error visible" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
