import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SbDashboard } from "../school_bus/SbDashboard";
import { renderWithQuery } from "@/test/test-utils";
import { useSbOperatorBriefing } from "@/hooks/useSchoolBus";

vi.mock("@/hooks/useSchoolBus", () => ({
  useSbOperatorBriefing: vi.fn(),
}));

const mockBriefing = vi.mocked(useSbOperatorBriefing);

const sampleDashboard = {
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
  recent_incidents: [],
  total_students: 18,
  total_drivers: 2,
};

const sample = {
  greeting: "Good morning, Kamlesh. Here's your Wednesday.",
  banner: { level: "warning" as const, message: "1 route delayed" },
  trips: [
    {
      id: 1,
      route_name: "Route A",
      driver_name: "Suresh",
      onboard: 10,
      total: 12,
      stop_index: 2,
      stop_total: 5,
      elapsed: "15 min",
      status: "pickup_in_progress",
    },
  ],
  action_items: [
    {
      type: "fee" as const,
      id: 1,
      title: "Student — ₹500",
      subtitle: "5 days overdue",
      phone: "+919999999999",
    },
  ],
  dashboard: sampleDashboard,
};

describe("SbDashboard", () => {
  beforeEach(() => {
    mockBriefing.mockReturnValue({
      data: sample,
      isLoading: false,
      error: null,
      dataUpdatedAt: Date.now() - 5000,
      isFetching: false,
    } as unknown as ReturnType<typeof useSbOperatorBriefing>);
  });

  it("renders briefing layout with trips and action items", () => {
    renderWithQuery(
      <MemoryRouter>
        <SbDashboard />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /School Bus Command Center/i })).toBeInTheDocument();
    expect(screen.getByText(/Good morning, Kamlesh/i)).toBeInTheDocument();
    expect(screen.getByText(/Route A/)).toBeInTheDocument();
    expect(screen.getByText(/Action items/i)).toBeInTheDocument();
    expect(screen.getByText(/Student — ₹500/)).toBeInTheDocument();
    expect(screen.getByText(/Updated \d+s ago/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockBriefing.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useSbOperatorBriefing>);
    renderWithQuery(
      <MemoryRouter>
        <SbDashboard />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading briefing/i)).toBeInTheDocument();
  });
});
