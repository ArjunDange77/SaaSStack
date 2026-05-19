import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SbDashboard } from "../school_bus/SbDashboard";
import { renderWithQuery } from "@/test/test-utils";
import { useSbOperatorDashboard } from "@/hooks/useSchoolBus";

vi.mock("@/hooks/useSchoolBus", () => ({
  useSbOperatorDashboard: vi.fn(),
}));

const mockDashboard = vi.mocked(useSbOperatorDashboard);

const sample = {
  active_buses: 1,
  ongoing_trips: 1,
  students_onboard: 12,
  absent_students_today: 2,
  overdue_fees_count: 3,
  incidents_today: 1,
  total_collected_today: "5000",
  pending_fees_total: "12000",
  late_routes: [],
  pending_collections: [],
  recent_incidents: [{ id: 1, category: "delay", severity: "low", description: "Late 10m", created_at: "" }],
  total_students: 18,
  total_drivers: 2,
};

describe("SbDashboard", () => {
  beforeEach(() => {
    mockDashboard.mockReturnValue({
      data: sample,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSbOperatorDashboard>);
  });

  it("renders command center KPIs", () => {
    renderWithQuery(
      <MemoryRouter>
        <SbDashboard />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /School Bus Command Center/i })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/Recent incidents/i)).toBeInTheDocument();
    expect(screen.getByText(/Late 10m/)).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useSbOperatorDashboard>);
    renderWithQuery(
      <MemoryRouter>
        <SbDashboard />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading operations/i)).toBeInTheDocument();
  });
});
