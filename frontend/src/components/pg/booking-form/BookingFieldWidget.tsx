import { isValidPublicEmail, isValidPublicFullName } from "@/lib/publicBookingValidation";
import type { DurationScrollState, PublicBookingFormFieldMeta } from "@/types/publicBookingForm";
import { BookingDurationScrollField } from "./widgets/BookingDurationScrollField";
import { BookingPhoneField } from "./widgets/BookingPhoneField";

interface Props {
  field: PublicBookingFormFieldMeta;
  value: string;
  error?: string;
  durationScroll?: DurationScrollState;
  onChange: (name: string, value: string) => void;
  onDurationQtyChange?: (qty: number) => void;
  onDurationUnitChange?: (unit: DurationScrollState["unit"]) => void;
}

export function BookingFieldWidget({
  field,
  value,
  error,
  durationScroll,
  onChange,
  onDurationQtyChange,
  onDurationUnitChange,
}: Props) {
  if (field.widget === "duration_scroll") {
    if (!durationScroll || !onDurationQtyChange || !onDurationUnitChange) {
      return null;
    }
    return (
      <BookingDurationScrollField
        label={field.label}
        required={field.required}
        qty={durationScroll.qty}
        unit={durationScroll.unit}
        error={error}
        onQtyChange={onDurationQtyChange}
        onUnitChange={onDurationUnitChange}
      />
    );
  }

  if (field.widget === "phone_in") {
    return (
      <BookingPhoneField
        label={field.label}
        required={field.required}
        value={value}
        error={error}
        placeholder={field.placeholder}
        onChange={(v) => onChange(field.name, v)}
      />
    );
  }

  const id = `booking-${field.name}`;
  const isTextarea = field.widget === "textarea";
  const inputType = field.widget === "email" ? "email" : "text";

  let showValid = false;
  if (!error && field.widget === "text" && field.name === "full_name") {
    showValid = isValidPublicFullName(value);
  }
  if (!error && field.widget === "email") {
    showValid = isValidPublicEmail(value) && value.trim().length > 0;
  }

  const inputClass = [
    isTextarea ? "booking-form-textarea" : "booking-form-input",
    error ? "error" : "",
    showValid ? "valid" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`booking-form-field${field.colspan === 1 ? " booking-form-field-half" : ""}`}>
      <label htmlFor={id} className="booking-form-field-label">
        {field.label}
        {field.required && !field.optionalLabel && (
          <span className="booking-form-required">*</span>
        )}
        {field.optionalLabel && (
          <span className="booking-form-optional">(optional)</span>
        )}
      </label>
      <div className="input-wrap">
        {isTextarea ? (
          <textarea
            id={id}
            className={inputClass}
            value={value}
            rows={3}
            maxLength={500}
            placeholder={field.placeholder}
            aria-invalid={Boolean(error)}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        ) : (
          <input
            id={id}
            type={inputType}
            className={inputClass}
            value={value}
            placeholder={field.placeholder}
            autoComplete={field.name === "full_name" ? "name" : field.widget === "email" ? "email" : undefined}
            aria-invalid={Boolean(error)}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        )}
        {showValid && <span className="valid-icon visible" aria-hidden>✓</span>}
      </div>
      {field.helpText && <p className="booking-form-field-hint">{field.helpText}</p>}
      {error && (
        <p className="booking-form-field-error visible" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
