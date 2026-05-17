import { normalizeIndiaPhone } from "@/lib/publicBookingValidation";

interface Props {
  label: string;
  required?: boolean;
  value: string;
  error?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function BookingPhoneField({
  label,
  required,
  value,
  error,
  placeholder,
  onChange,
}: Props) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const valid = !error && digits.length === 10 && /^[6-9]\d{9}$/.test(normalizeIndiaPhone(digits));

  return (
    <div className="booking-form-field">
      <label htmlFor="booking-phone" className="booking-form-field-label">
        {label}
        {required && <span className="booking-form-required">*</span>}
      </label>
      <div className={`phone-wrap${error ? " error" : ""}${valid ? " valid" : ""}`}>
        <span className="phone-prefix">+91</span>
        <input
          id="booking-phone"
          type="tel"
          inputMode="numeric"
          className="phone-input"
          value={digits}
          maxLength={10}
          placeholder={placeholder}
          autoComplete="tel"
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
      </div>
      {error && (
        <p className="booking-form-field-error visible" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
