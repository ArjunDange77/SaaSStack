import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SbParentPortal } from "../school_bus/SbParentPortal";
import { renderWithQuery } from "@/test/test-utils";
import { useSbParentMe } from "@/hooks/useSchoolBus";

vi.mock("@/hooks/useSchoolBus", () => ({
  useSbParentMe: vi.fn(),
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
              detail: "Picked up at Oak Street",
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

  it("renders hero, fee pills, and calendar", () => {
    renderWithQuery(
      <MemoryRouter>
        <SbParentPortal />
      </MemoryRouter>
    );
    expect(screen.getByText(/Hello, Priya/i)).toBeInTheDocument();
    expect(screen.getByText(/on the bus/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Aarav Sharma is on the bus/i })).toBeInTheDocument();
    expect(screen.getByText(/1500/)).toBeInTheDocument();
    expect(screen.getByText(/Fee due/i)).toBeInTheDocument();
  });
});
