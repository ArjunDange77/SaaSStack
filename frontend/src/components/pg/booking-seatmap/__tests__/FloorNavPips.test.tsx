import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FloorNavPips } from "../FloorNavPips";

const floors = [
  {
    key: "1",
    label: "1st",
    sort_order: 1,
    available_count: 5,
    rooms: [
      {
        id: 1,
        room_number: "101",
        floor: "1",
        occupancy_limit: 2,
        current_occupancy: 0,
        occupancy_display: "0/2",
        availability_label: "Available",
        sharing_label: "Shared",
        sharing: "shared" as const,
        visual_status: "avail_shared" as const,
        selectable: true,
        free_beds: 2,
        room_status: "available",
      },
    ],
  },
];

describe("FloorNavPips", () => {
  it("renders floor pip and handles click", async () => {
    const onFloorSelect = vi.fn();
    render(
      <FloorNavPips floors={floors} activeFloorKey="1" onFloorSelect={onFloorSelect} />
    );
    await userEvent.click(screen.getByRole("button", { name: /Floor 1st/i }));
    expect(onFloorSelect).toHaveBeenCalledWith("1");
  });
});
