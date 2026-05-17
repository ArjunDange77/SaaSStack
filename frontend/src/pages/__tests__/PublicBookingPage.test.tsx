import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PublicBookingPage } from "../PublicBookingPage";

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
  isAuthError: () => false,
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    get: mockGet,
    post: mockPost,
    isAxiosError: vi.fn(() => false),
  },
}));

const listRooms = [
  {
    id: 1,
    room_number: "201",
    floor: "2",
    occupancy_display: "0/2",
    availability_label: "Available",
    monthly_rent_per_bed: "8000",
    amenities: ["wifi"],
  },
];

const seatmapPayload = {
  schema_version: "1.0",
  tenant: { slug: "pg-demo", name: "PG Demo" },
  summary: { total_rooms: 1, available_rooms: 1, free_beds: 2, full_rooms: 0 },
  floors: [
    {
      key: "2",
      label: "2nd",
      sort_order: 2,
      available_count: 1,
      rooms: [
        {
          id: 1,
          room_number: "201",
          floor: "2",
          occupancy_limit: 2,
          current_occupancy: 0,
          occupancy_display: "0/2",
          availability_label: "Available",
          sharing_label: "Shared",
          sharing: "shared",
          visual_status: "avail_shared",
          selectable: true,
          free_beds: 2,
          room_status: "available",
          monthly_rent_per_bed: "8000",
          amenities: ["wifi"],
        },
      ],
    },
  ],
};

function renderBooking() {
  sessionStorage.removeItem("public-booking-view");
  return render(
    <MemoryRouter initialEntries={["/book/pg-demo"]}>
      <Routes>
        <Route path="/book/:tenantSlug" element={<PublicBookingPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PublicBookingPage", () => {
  beforeEach(() => {
    mockGet.mockImplementation((url: string) => {
      const path = String(url);
      if (path.includes("available")) {
        return Promise.resolve({ data: listRooms });
      }
      return Promise.resolve({ data: seatmapPayload });
    });
    mockPost.mockResolvedValue({ data: { id: 99 } });
  });

  it("loads seatmap by default and selects room via panel", async () => {
    renderBooking();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Room 201/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /Room 201/i }));
    await userEvent.click(screen.getByRole("button", { name: /Select Room 201/i }));
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
  });

  it("switches to list view", async () => {
    renderBooking();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /List view/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /List view/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
    });
  });

  it("allows choose later from seatmap", async () => {
    renderBooking();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Room 201/i })).toBeInTheDocument();
    });
    await userEvent.click(await screen.findByTestId("choose-later-btn"));
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
  });
});
