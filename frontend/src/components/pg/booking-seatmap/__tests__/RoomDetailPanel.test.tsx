import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RoomDetailPanel } from "../RoomDetailPanel";
import type { PublicSeatmapRoom } from "@/types/publicSeatmap";

const room: PublicSeatmapRoom = {
  id: 2,
  room_number: "203",
  floor: "2",
  occupancy_limit: 2,
  current_occupancy: 1,
  occupancy_display: "1/2",
  availability_label: "Available",
  sharing_label: "Shared",
  sharing: "shared",
  visual_status: "partial",
  selectable: true,
  free_beds: 1,
  room_status: "available",
  monthly_rent_per_bed: "5000",
  amenities: ["wifi"],
};

describe("RoomDetailPanel", () => {
  it("shows hint when no room", () => {
    render(<RoomDetailPanel room={null} />);
    expect(screen.getByText(/Hover a room/i)).toBeInTheDocument();
  });

  it("shows price and select CTA for bookable room", async () => {
    const onSelect = vi.fn();
    render(<RoomDetailPanel room={room} floorLabel="2nd" onSelect={onSelect} />);
    expect(screen.getByText("Room 203")).toBeInTheDocument();
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Select Room 203/i }));
    expect(onSelect).toHaveBeenCalled();
  });

  it("hides select CTA for full room", () => {
    const full = { ...room, visual_status: "full" as const, selectable: false };
    render(<RoomDetailPanel room={full} onSelect={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Select Room/i })).not.toBeInTheDocument();
  });
});
