import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SbTripsPage } from "../school_bus/SbTripsPage";
import { renderWithQuery } from "@/test/test-utils";
import {
  useSbOperatorTripsByDate,
  useSbOperatorTripsToday,
  useSbTripSummary,
  useSbTripsGenerate,
} from "@/hooks/useSchoolBus";
import { useResourceSchema } from "@/hooks/useResource";

vi.mock("@/hooks/useSchoolBus", () => ({
  useSbOperatorTripsToday: vi.fn(),
  useSbOperatorTripsByDate: vi.fn(),
  useSbTripsGenerate: vi.fn(),
  useSbTripSummary: vi.fn(),
}));

vi.mock("@/hooks/useResource", () => ({
  useResourceSchema: vi.fn(),
  useResourceList: vi.fn(() => ({
    data: { results: [{ id: 1, trip_date: "2026-05-20", status: "scheduled" }], count: 1 },
    isLoading: false,
    isFetching: false,
  })),
  useResourceMutations: vi.fn(() => ({
    create: { mutateAsync: vi.fn(), isPending: false },
  })),
}));

const mockToday = vi.mocked(useSbOperatorTripsToday);
const mockByDate = vi.mocked(useSbOperatorTripsByDate);
const mockGenerate = vi.mocked(useSbTripsGenerate);
const mockSummary = vi.mocked(useSbTripSummary);
const mockSchema = vi.mocked(useResourceSchema);

const tripsSchema = {
  slug: "sb-trips",
  title: "Trips",
  schema_version: "1.0",
  fields: [],
  list_display: ["id", "trip_date", "status"],
  list_path: "/api/r/sb-trips/",
  detail_path_template: "/api/r/sb-trips/{id}/",
  ordering: { default: ["-trip_date"] },
  capabilities: { create: true, update: true, delete: true, actions: [] },
};

describe("SbTripsPage", () => {
  beforeEach(() => {
    mockToday.mockReturnValue({
      data: {
        stats: {
          total_students: 10,
          absent_count: 1,
          avg_duration_minutes: 40,
          on_time_rate: 95,
        },
        trips: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSbOperatorTripsToday>);
    mockByDate.mockReturnValue({
      data: { date: "2026-05-19", trips: [] },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSbOperatorTripsByDate>);
    mockGenerate.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSbTripsGenerate>);
    mockSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSbTripSummary>);
    mockSchema.mockReturnValue({
      data: tripsSchema,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useResourceSchema>);
  });

  it("renders generate week control on Today tab", () => {
    renderWithQuery(
      <MemoryRouter>
        <SbTripsPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /Generate week/i })).toBeInTheDocument();
  });

  it("calls generate mutation", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ created: 3 });
    mockGenerate.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSbTripsGenerate>);
    const user = userEvent.setup();
    renderWithQuery(
      <MemoryRouter>
        <SbTripsPage />
      </MemoryRouter>
    );
    await user.click(screen.getByRole("button", { name: /Generate week/i }));
    expect(mutateAsync).toHaveBeenCalledWith(7);
  });

  it("shows All trips CRUD tab with New trip", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <MemoryRouter initialEntries={["/sb/trips?tab=today"]}>
        <Routes>
          <Route path="/sb/trips" element={<SbTripsPage />} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole("tab", { name: /All trips/i }));
    expect(screen.getByRole("button", { name: /New trip/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Generate week/i })).not.toBeInTheDocument();
  });
});
