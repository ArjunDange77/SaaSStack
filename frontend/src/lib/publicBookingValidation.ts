import type { PublicBookingFormFieldMeta } from "@/types/publicBookingForm";

export const REMARKS_MAX_LENGTH = 500;
export const DURATION_QTY_MIN = 1;
export const DURATION_QTY_MAX = 31;

export type DurationUnit = "day" | "week" | "month";

/** Letters, spaces, hyphen, apostrophe (Unicode). */
export const PUBLIC_FULL_NAME_RE = /^[\p{L}]+(?:[\s'-][\p{L}]+)*$/u;

const STRUCTURED_DURATION_RE =
  /^(\d{1,2})\s+(day|days|week|weeks|month|months)$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PublicBookingFieldName =
  | "full_name"
  | "email"
  | "phone"
  | "duration"
  | "remarks"
  | "website";

export type PublicBookingFieldErrors = Partial<Record<PublicBookingFieldName, string>>;

export function normalizeIndiaPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

export function isValidPublicFullName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 200) return false;
  if (!PUBLIC_FULL_NAME_RE.test(trimmed)) return false;
  if (/^[\s'-]+$/.test(trimmed)) return false;
  if (/^['-]/.test(trimmed) || /['-]$/.test(trimmed)) return false;
  return true;
}

export function isValidPublicEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return true;
  if (trimmed.length > 254) return false;
  return EMAIL_RE.test(trimmed);
}

export function composeDuration(qty: number, unit: DurationUnit): string {
  const label =
    unit === "day"
      ? qty === 1
        ? "day"
        : "days"
      : unit === "week"
        ? qty === 1
          ? "week"
          : "weeks"
        : qty === 1
          ? "month"
          : "months";
  return `${qty} ${label}`;
}

export function parseStructuredDuration(
  value: string
): { qty: number; unit: DurationUnit } | null {
  const m = (value || "").trim().match(STRUCTURED_DURATION_RE);
  if (!m) return null;
  const qty = Number(m[1]);
  const raw = m[2].toLowerCase();
  if (qty < DURATION_QTY_MIN || qty > DURATION_QTY_MAX) return null;
  if (raw.startsWith("day")) return { qty, unit: "day" };
  if (raw.startsWith("week")) return { qty, unit: "week" };
  return { qty, unit: "month" };
}

export function isValidPublicDuration(value: string): boolean {
  const duration = (value || "").trim();
  if (duration.length < 2 || duration.length > 120) return false;
  if (STRUCTURED_DURATION_RE.test(duration)) {
    return parseStructuredDuration(duration) !== null;
  }
  if (/^[\W_]+$/.test(duration)) return false;
  return true;
}

type FieldValidator = (value: string) => string | undefined;

const FIELD_VALIDATORS: Record<string, FieldValidator> = {
  full_name: (value) => {
    const name = value.trim();
    if (!isValidPublicFullName(name)) {
      if (name.length < 2) return "Enter your full name (at least 2 characters).";
      if (name.length > 200) return "Name is too long (max 200 characters).";
      return "Use letters only. Hyphens and apostrophes are allowed.";
    }
    return undefined;
  },
  email: (value) => {
    if (!isValidPublicEmail(value)) return "Enter a valid email address.";
    return undefined;
  },
  phone: (value) => {
    const phone = normalizeIndiaPhone(value);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return "Enter a valid 10-digit Indian mobile number (starts with 6–9).";
    }
    return undefined;
  },
  duration: (value) => {
    const duration = value.trim();
    if (!isValidPublicDuration(duration)) {
      if (duration.length < 2) return "Select how long you plan to stay.";
      if (duration.length > 120) return "Duration is too long (max 120 characters).";
      return "Enter a valid duration (e.g. 3 months).";
    }
    return undefined;
  },
  remarks: (value) => {
    if (value.trim().length > REMARKS_MAX_LENGTH) {
      return `Remarks are too long (max ${REMARKS_MAX_LENGTH} characters).`;
    }
    return undefined;
  },
};

export function validateField(
  name: string,
  value: string,
  required?: boolean
): string | undefined {
  const trimmed = value.trim();
  if (required && !trimmed && name !== "email" && name !== "remarks") {
    if (name === "full_name") return "Enter your full name (at least 2 characters).";
    if (name === "phone") return "Enter a valid 10-digit Indian mobile number (starts with 6–9).";
    if (name === "duration") return "Select how long you plan to stay.";
    return "This field is required.";
  }
  if (!trimmed && (name === "email" || name === "remarks")) {
    return undefined;
  }
  const fn = FIELD_VALIDATORS[name];
  return fn ? fn(value) : undefined;
}

export function validatePublicBookingForm(
  values: Record<string, string>,
  fields: PublicBookingFormFieldMeta[],
  options?: { website?: string }
): PublicBookingFieldErrors {
  const errors: PublicBookingFieldErrors = {};
  for (const field of fields) {
    const err = validateField(field.name, values[field.name] ?? "", field.required);
    if (err) {
      errors[field.name as PublicBookingFieldName] = err;
    }
  }
  if ((options?.website ?? "").trim()) {
    errors.website = "Invalid submission.";
  }
  return errors;
}

export function validateDurationPicker(
  qty: number,
  unit: DurationUnit | ""
): string | undefined {
  if (!unit) return "Select a duration unit.";
  if (!Number.isInteger(qty) || qty < DURATION_QTY_MIN || qty > DURATION_QTY_MAX) {
    return `Select a number from ${DURATION_QTY_MIN} to ${DURATION_QTY_MAX}.`;
  }
  return undefined;
}

export function mapApiErrorsToFields(data: unknown): PublicBookingFieldErrors {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }
  const out: PublicBookingFieldErrors = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key === "detail") continue;
    if (Array.isArray(value)) {
      out[key as PublicBookingFieldName] = value.map(String).join("; ");
    } else if (typeof value === "string") {
      out[key as PublicBookingFieldName] = value;
    }
  }
  return out;
}
