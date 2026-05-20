import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SbParentPortal } from "../school_bus/SbParentPortal";
import { renderWithQuery } from "@/test/test-utils";
import { useSbParentMe, type SbParentMe } from "@/hooks/useSchoolBus";
import apiFixture from "@/test/fixtures/sb-parent-me.json";

vi.mock("@/hooks/useSchoolBus", () => ({
  useSbParentMe: vi.fn(),
}));

vi.mock("@/components/school_bus/LiveBusMap", () => ({
  LiveBusMap: () => <div data-testid="live-bus-map" />,
}));

const mockParentMe = vi.mocked(useSbParentMe);
const fixture = apiFixture as SbParentMe;

describe("SbParentPortal API fixture", () => {
  beforeEach(() => {
    mockParentMe.mockReturnValue({
      data: fixture,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSbParentMe>);
  });

  it("renders with production-shaped parent/me JSON (trip_status not status)", () => {
    const summary = fixture.children[0]?.today_trip_summary;
    expect(summary).toBeDefined();
    expect(summary).toHaveProperty("trip_status");
    expect(summary).not.toHaveProperty("status");

    renderWithQuery(
      <MemoryRouter>
        <SbParentPortal />
      </MemoryRouter>
    );

    expect(screen.getByText(/Hello, Priya/i)).toBeInTheDocument();
    expect(screen.getByText(/Today's trip/i)).toBeInTheDocument();
    expect(screen.getByText(/started/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Bus en route for Rahul Naik/i })).toBeInTheDocument();
    expect(screen.getByTestId("live-bus-map")).toBeInTheDocument();
  });
});
