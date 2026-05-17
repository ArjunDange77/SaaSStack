import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BookingSeatMap } from "../BookingSeatMap";
import type { PublicSeatmapPayload } from "@/types/publicSeatmap";

const data: PublicSeatmapPayload = {
  schema_version: "1.0",
  tenant: { slug: "pg-demo", name: "PG Demo" },
  summary: { total_rooms: 2, available_rooms: 2, free_beds: 3, full_rooms: 0 },
  floors: [
    {
      key: "2",
      label: "2nd",
      sort_order: 2,
      available_count: 2,
      rooms: [
        {
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
        },
        {
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
        },
      ],
    },
  ],
};

describe("BookingSeatMap", () => {
  it("renders tiles and updates panel on select", async () => {
    const onSelect = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <BookingSeatMap
        data={data}
        selectedRoom={null}
        onSelectRoom={onSelect}
        onConfirmSelection={onConfirm}
        onChooseLater={vi.fn()}
      />
    );
    expect(screen.getByText(/PG Demo/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Room 201/i }));
    expect(onSelect).toHaveBeenCalled();
    rerender(
      <BookingSeatMap
        data={data}
        selectedRoom={data.floors[0].rooms[0]}
        onSelectRoom={onSelect}
        onConfirmSelection={onConfirm}
        onChooseLater={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Select Room 201/i })).toBeInTheDocument();
  });
});
