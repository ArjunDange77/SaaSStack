import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SbParentPortal } from "../school_bus/SbParentPortal";
import { renderWithQuery } from "@/test/test-utils";
import { useSbParentMe } from "@/hooks/useSchoolBus";

vi.mock("@/hooks/useSchoolBus", () => ({
  useSbParentMe: vi.fn(),
}));

vi.mock("@/components/school_bus/LiveBusMap", () => ({
  LiveBusMap: () => <div data-testid="live-bus-map" />,
}));

const mockParentMe = vi.mocked(useSbParentMe);

describe("SbParentPortal", () => {
  beforeEach(() => {
    mockParentMe.mockReturnValue({
      data: {
        parent: { id: 1, full_name: "Priya Sharma" },
        children: [
          {
            id: 1,
            full_name: "Aarav Sharma",
            school_name: "Goa School",
            class_grade: "5A",
            route_name: "Morning Route A",
            bus_number: "BUS-101",
            pickup_stop: "Oak Street",
            drop_stop: "School Gate",
            pickup_status: "present",
            drop_status: "not_marked",
            fee_status: "unpaid",
            fee_overdue_amount: "1500.00",
            hero_status: {
              level: "safe",
              headline: "Aarav Sharma is on the bus",
              detail: "Picked up at Oak Street · 9:45 AM",
            },
            today_trip_summary: {
              trip_id: 10,
              trip_date: "2026-05-20",
              trip_status: "pickup_in_progress",
              route_name: "Morning Route A",
              bus_number: "BUS-101",
              pickup_status: "present",
              started_at: "2026-05-20T04:00:00Z",
              completed_at: null,
            },
            tracking: {
              active: true,
              trip_id: 10,
              last_location: {
                latitude: "15.4909",
                longitude: "73.8278",
                recorded_at: "2026-05-20T04:15:00Z",
              },
              stale: false,
            },
            calendar_days: [{ date: "2026-05-01", status: "present" }],
            fees: [
              {
                month: "May 2026",
                amount: "1500.00",
                status: "unpaid",
                due_date: "2026-05-10",
                payment_link_url: "",
              },
            ],
          },
        ],
        reminders: [{ id: 1, kind: "fee_due", title: "Fee due", body: "Please pay", created_at: "" }],
        recent_incidents: [],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSbParentMe>);
  });

  it("renders hero, today trip card, fee pills, and calendar", () => {
    renderWithQuery(
      <MemoryRouter>
        <SbParentPortal />
      </MemoryRouter>
    );
    expect(screen.getByText(/Hello, Priya/i)).toBeInTheDocument();
    expect(screen.getByText(/Today's trip/i)).toBeInTheDocument();
    expect(screen.getByText(/pickup in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/on the bus/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Aarav Sharma is on the bus/i })).toBeInTheDocument();
    expect(screen.getByText(/Picked up at Oak Street/i)).toBeInTheDocument();
    expect(screen.getByText(/9:45 AM/i)).toBeInTheDocument();
    expect(screen.getByTestId("live-bus-map")).toBeInTheDocument();
    expect(screen.getByText(/1500/)).toBeInTheDocument();
    expect(screen.getByText(/Fee due/i)).toBeInTheDocument();
  });
});
