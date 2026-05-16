import { describe, expect, it } from "vitest";
import { normalizeIndiaPhone, validatePublicBookingForm } from "../publicBookingValidation";

describe("publicBookingValidation", () => {
  it("normalizes India phone with country code", () => {
    expect(normalizeIndiaPhone("+91 98765 43210")).toBe("9876543210");
  });

  it("accepts valid booking form", () => {
    const errors = validatePublicBookingForm({
      fullName: "Arjun Dange",
      phone: "9876543210",
      duration: "3 months",
      remarks: "",
    });
    expect(errors).toEqual({});
  });

  it("rejects invalid phone and short duration", () => {
    const errors = validatePublicBookingForm({
      fullName: "Test",
      phone: "1234567890",
      duration: "x",
      remarks: "",
    });
    expect(errors.phone).toBeTruthy();
    expect(errors.duration).toBeTruthy();
  });
});
