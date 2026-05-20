import { describe, it, expect } from "vitest";
import { kpiSubtext } from "../kpiSubtext";

describe("kpiSubtext", () => {
  it("returns total rooms copy for available_rooms", () => {
    expect(kpiSubtext("available_rooms", { total_rooms: 6 })).toEqual({
      text: "of 6 total",
      tone: "neutral",
    });
  });

  it("returns needs review for pending bookings", () => {
    expect(kpiSubtext("pending_bookings", {})?.text).toBe("needs review");
  });

  it("returns null when trend would be shown", () => {
    expect(
      kpiSubtext("occupancy_rate", {}, { direction: "up", delta: 1, period: "7d" })
    ).toBeNull();
  });
});
