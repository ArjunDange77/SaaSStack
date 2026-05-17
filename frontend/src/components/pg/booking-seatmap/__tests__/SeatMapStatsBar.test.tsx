import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SeatMapStatsBar } from "../SeatMapStatsBar";

describe("SeatMapStatsBar", () => {
  it("renders all summary stats", () => {
    render(
      <SeatMapStatsBar
        summary={{
          total_rooms: 48,
          available_rooms: 30,
          free_beds: 52,
          full_rooms: 18,
        }}
      />
    );
    expect(screen.getByText("48")).toBeInTheDocument();
    expect(screen.getByText("Total rooms")).toBeInTheDocument();
    expect(screen.getByText("Free beds")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });
});
