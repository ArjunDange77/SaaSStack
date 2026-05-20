import { describe, expect, it } from "vitest";
import { PUBLIC_BOOKING_FORM_FIELDS } from "@/config/publicBookingFormFields";
import {
  composeDuration,
  isValidPublicEmail,
  isValidPublicFullName,
  isValidPublicDuration,
  normalizeIndiaPhone,
  validateDurationPicker,
  validatePublicBookingForm,
} from "../publicBookingValidation";

describe("publicBookingValidation", () => {
  it("normalizes India phone with country code", () => {
    expect(normalizeIndiaPhone("+91 98765 43210")).toBe("9876543210");
  });

  it("accepts valid booking form", () => {
    const errors = validatePublicBookingForm(
      {
        full_name: "Arjun Dange",
        phone: "9876543210",
        email: "",
        duration: "3 months",
        remarks: "",
      },
      PUBLIC_BOOKING_FORM_FIELDS
    );
    expect(errors).toEqual({});
  });

  it("rejects invalid phone and short duration", () => {
    const errors = validatePublicBookingForm(
      {
        full_name: "Test",
        phone: "1234567890",
        email: "",
        duration: "x",
        remarks: "",
      },
      PUBLIC_BOOKING_FORM_FIELDS
    );
    expect(errors.phone).toBeTruthy();
    expect(errors.duration).toBeTruthy();
  });

  it("validates optional email", () => {
    expect(isValidPublicEmail("")).toBe(true);
    expect(isValidPublicEmail("bad")).toBe(false);
    expect(isValidPublicEmail("a@b.co")).toBe(true);
  });

  it("rejects names with digits or symbols", () => {
    expect(isValidPublicFullName("John3")).toBe(false);
    expect(isValidPublicFullName("Arjun@")).toBe(false);
    expect(isValidPublicFullName("Mary-Jane")).toBe(true);
    expect(isValidPublicFullName("O'Brien")).toBe(true);
  });

  it("composes and validates structured duration", () => {
    expect(composeDuration(31, "day")).toBe("31 days");
    expect(isValidPublicDuration("31 days")).toBe(true);
    expect(isValidPublicDuration("0 months")).toBe(false);
    expect(validateDurationPicker(32, "month")).toBeTruthy();
    expect(validateDurationPicker(3, "month")).toBeUndefined();
  });
});
