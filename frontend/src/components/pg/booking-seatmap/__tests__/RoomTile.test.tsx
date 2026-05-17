import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { RoomTile } from "../RoomTile";
import type { PublicSeatmapRoom } from "@/types/publicSeatmap";

const base: PublicSeatmapRoom = {
  id: 1,
  room_number: "201",
  floor: "2",
  occupancy_limit: 1,
  current_occupancy: 0,
  occupancy_display: "0/1",
  availability_label: "Available",
  sharing_label: "Single",
  sharing: "single",
  visual_status: "avail_single",
  selectable: true,
  free_beds: 1,
  room_status: "available",
  monthly_rent_per_bed: "8500",
  amenities: ["wifi"],
};

describe("RoomTile", () => {
  it("renders room number and occupancy", () => {
    render(<RoomTile room={base} />);
    expect(screen.getByText("201")).toBeInTheDocument();
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("calls onSelect when clicked", async () => {
    const onSelect = vi.fn();
    render(<RoomTile room={base} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(base);
  });

  it("does not render button for full room", () => {
    const full = { ...base, visual_status: "full" as const, selectable: false };
    render(<RoomTile room={full} onSelect={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("sets aria-pressed when selected", () => {
    render(<RoomTile room={base} selected onSelect={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});
