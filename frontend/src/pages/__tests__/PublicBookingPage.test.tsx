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

const rooms = [
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

function renderBooking() {
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
    mockGet.mockResolvedValue({ data: rooms });
  });

  it("lists rooms and disables continue until selection", async () => {
    renderBooking();
    await waitFor(() => {
      expect(screen.getByText(/Room 201/i)).toBeInTheDocument();
    });
    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    expect(continueBtn).toBeDisabled();
    await userEvent.click(screen.getByText(/Room 201/i));
    expect(continueBtn).not.toBeDisabled();
  });

  it("allows skip without selecting a room", async () => {
    renderBooking();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /choose a room later/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole("button", { name: /choose a room later/i }));
    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
  });
});
