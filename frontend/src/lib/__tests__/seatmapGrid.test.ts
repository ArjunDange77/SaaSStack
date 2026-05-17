import { describe, it, expect } from "vitest";
import { seatmapGridColumns } from "../seatmapGrid";

describe("seatmapGridColumns", () => {
  it("uses compact columns on mobile", () => {
    expect(seatmapGridColumns(12, true)).toBe(6);
    expect(seatmapGridColumns(8, true)).toBe(4);
    expect(seatmapGridColumns(3, true)).toBe(3);
  });

  it("fits a full floor row on desktop", () => {
    expect(seatmapGridColumns(12, false)).toBe(12);
    expect(seatmapGridColumns(6, false)).toBe(6);
  });
});
