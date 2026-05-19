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
            route_name: "Morning Route A",
            bus_number: "BUS-101",
            pickup_stop: "Oak Street",
            drop_stop: "School Gate",
            pickup_status: "present",
            drop_status: "not_marked",
            fee_status: "unpaid",
            fee_overdue_amount: "1500.00",
          },
        ],
        reminders: [{ id: 1, kind: "fee_due", title: "Fee due", body: "Please pay", created_at: "" }],
        recent_incidents: [],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSbParentMe>);
  });

  it("renders child card and fee badge", () => {
    renderWithQuery(
      <MemoryRouter>
        <SbParentPortal />
      </MemoryRouter>
    );
    expect(screen.getByText(/Hello, Priya/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aarav Sharma" })).toBeInTheDocument();
    expect(screen.getByText(/1500/)).toBeInTheDocument();
    expect(screen.getByText(/Fee due/i)).toBeInTheDocument();
  });
});
