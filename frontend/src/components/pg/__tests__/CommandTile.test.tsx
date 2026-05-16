import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CommandTile } from "../CommandTile";

describe("CommandTile", () => {
  it("renders value, label, and trend", () => {
    render(
      <MemoryRouter>
        <CommandTile
          to="/r/pg-rooms"
          value={5}
          label="Available"
          trend={{ direction: "up", delta: 2, period: "7d" }}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/r/pg-rooms");
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText(/2.*7d/)).toBeInTheDocument();
  });
});
