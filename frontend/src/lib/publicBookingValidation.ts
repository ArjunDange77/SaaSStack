export const REMARKS_MAX_LENGTH = 500;

export type PublicBookingFieldErrors = Partial<
  Record<"full_name" | "phone" | "duration" | "remarks" | "website", string>
>;

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

export function validatePublicBookingForm(values: {
  fullName: string;
  phone: string;
  duration: string;
  remarks: string;
  website?: string;
}): PublicBookingFieldErrors {
  const errors: PublicBookingFieldErrors = {};
  const name = values.fullName.trim();
  const phone = normalizeIndiaPhone(values.phone);
  const duration = values.duration.trim();
  const remarks = values.remarks.trim();

  if (name.length < 2) {
    errors.full_name = "Enter your full name (at least 2 characters).";
  } else if (name.length > 200) {
    errors.full_name = "Name is too long (max 200 characters).";
  } else if (/^\d+$/.test(name)) {
    errors.full_name = "Name cannot be only numbers.";
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    errors.phone = "Enter a valid 10-digit Indian mobile number (starts with 6–9).";
  }

  if (duration.length < 2) {
    errors.duration = "Enter how long you plan to stay (e.g. 3 months).";
  } else if (duration.length > 120) {
    errors.duration = "Duration is too long (max 120 characters).";
  }

  if (remarks.length > REMARKS_MAX_LENGTH) {
    errors.remarks = `Remarks are too long (max ${REMARKS_MAX_LENGTH} characters).`;
  }

  if ((values.website ?? "").trim()) {
    errors.website = "Invalid submission.";
  }

  return errors;
}

export function mapApiErrorsToFields(data: unknown): PublicBookingFieldErrors {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }
  const out: PublicBookingFieldErrors = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key === "detail") continue;
    if (Array.isArray(value)) {
      out[key as keyof PublicBookingFieldErrors] = value.map(String).join("; ");
    } else if (typeof value === "string") {
      out[key as keyof PublicBookingFieldErrors] = value;
    }
  }
  return out;
}
