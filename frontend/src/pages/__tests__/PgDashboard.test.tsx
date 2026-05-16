import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PgDashboard } from "../PgDashboard";
import { renderWithQuery } from "@/test/test-utils";
import { usePgDashboard } from "@/hooks/useResource";

vi.mock("@/hooks/useResource", () => ({
  usePgDashboard: vi.fn(),
}));

const mockUsePgDashboard = vi.mocked(usePgDashboard);

describe("PgDashboard", () => {
  beforeEach(() => {
    mockUsePgDashboard.mockReturnValue({
      data: {
        occupancy_rate: 33.3,
        rooms_available: 4,
        total_rooms: 6,
        pending_bookings: 2,
        rent_overdue: 0,
        open_complaints: 0,
        active_residents: 8,
        rent_due_unpaid: 0,
        occupied_rooms: 2,
        rooms_full: 2,
        rooms_maintenance: 0,
        as_of: "2026-05-16",
        trends: {},
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof usePgDashboard>);
  });

  it("renders command center and alert when pending bookings", () => {
    renderWithQuery(
      <MemoryRouter>
        <PgDashboard />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /Command center/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pending booking request/i })).toBeInTheDocument();
    expect(screen.getByText(/33.3%/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUsePgDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof usePgDashboard>);
    renderWithQuery(
      <MemoryRouter>
        <PgDashboard />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading your property overview/i)).toBeInTheDocument();
  });
});
