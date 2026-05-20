import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ResidentPortal } from "../ResidentPortal";
import { renderWithQuery } from "@/test/test-utils";

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...mod, useQuery: vi.fn() };
});

const mockUseQuery = vi.mocked(useQuery);

const portalData = {
  profile: {
    id: 1,
    full_name: "Demo Resident",
    phone: "9000000099",
    email: "",
    onboarding_status: "completed",
    active_status: "active",
  },
  assignment: {
    id: 1,
    room_number: "101",
    floor: "1",
    assigned_date: "2026-01-01",
  },
  documents: [],
  latest_rent: null,
  open_complaints: [],
  recent_activity: [],
};

describe("ResidentPortal", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: portalData,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useQuery>);
  });

  it("renders greeting and room when data loads", () => {
    renderWithQuery(
      <MemoryRouter>
        <ResidentPortal />
      </MemoryRouter>
    );
    expect(screen.getByText(/Hi, Demo/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /My room/i })).toBeInTheDocument();
    expect(screen.getByText(/101/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useQuery>);
    renderWithQuery(
      <MemoryRouter>
        <ResidentPortal />
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it("shows error message on failure", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Server error"),
    } as ReturnType<typeof useQuery>);
    renderWithQuery(
      <MemoryRouter>
        <ResidentPortal />
      </MemoryRouter>
    );
    expect(screen.getByText(/Could not load your profile|Server error/i)).toBeInTheDocument();
  });
});
