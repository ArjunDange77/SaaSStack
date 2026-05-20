import { describe, it, expect } from "vitest";
import {
  badgeTextForStatus,
  isTileInteractive,
  selectedClassForStatus,
  tileClassForStatus,
} from "../seatmapStatus";

describe("seatmapStatus", () => {
  it("maps visual status to tile classes", () => {
    expect(tileClassForStatus("avail_single")).toBe("rt-avail-single");
    expect(tileClassForStatus("avail_shared")).toBe("rt-avail-shared");
    expect(tileClassForStatus("partial")).toBe("rt-partial");
    expect(tileClassForStatus("full")).toBe("rt-full");
    expect(tileClassForStatus("maintenance")).toBe("rt-maintenance");
  });

  it("maps selected classes", () => {
    expect(selectedClassForStatus("avail_single")).toBe("rt-selected-green");
    expect(selectedClassForStatus("avail_shared")).toBe("rt-selected-blue");
    expect(selectedClassForStatus("partial")).toBe("rt-selected-amber");
  });

  it("badge text for partial includes free beds", () => {
    expect(badgeTextForStatus("partial", 2)).toBe("Partial (2 free)");
  });

  it("knows interactive tiles", () => {
    expect(isTileInteractive("avail_single")).toBe(true);
    expect(isTileInteractive("full")).toBe(false);
    expect(isTileInteractive("maintenance")).toBe(false);
  });
});
