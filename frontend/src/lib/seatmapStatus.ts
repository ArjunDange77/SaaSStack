import type { PublicSeatmapRoom, SeatmapVisualStatus } from "@/types/publicSeatmap";
import type { RoomCardData } from "@/components/pg/RoomCard";

export function tileClassForStatus(status: SeatmapVisualStatus): string {
  switch (status) {
    case "avail_single":
      return "rt-avail-single";
    case "avail_shared":
      return "rt-avail-shared";
    case "partial":
      return "rt-partial";
    case "maintenance":
      return "rt-maintenance";
    case "full":
    default:
      return "rt-full";
  }
}

export function selectedClassForStatus(status: SeatmapVisualStatus): string {
  switch (status) {
    case "avail_single":
      return "rt-selected-green";
    case "avail_shared":
      return "rt-selected-blue";
    case "partial":
      return "rt-selected-amber";
    default:
      return "rt-selected-amber";
  }
}

export function pulseClassForStatus(status: SeatmapVisualStatus): string {
  switch (status) {
    case "avail_single":
      return "pulse";
    case "avail_shared":
      return "pulse pulse-blue";
    case "partial":
      return "pulse pulse-amber";
    default:
      return "pulse";
  }
}

export function badgeClassForStatus(status: SeatmapVisualStatus): string {
  switch (status) {
    case "avail_single":
      return "rp-badge rpb-green";
    case "avail_shared":
      return "rp-badge rpb-blue";
    case "partial":
      return "rp-badge rpb-amber";
    default:
      return "rp-badge";
  }
}

export function badgeTextForStatus(
  status: SeatmapVisualStatus,
  freeBeds: number
): string {
  switch (status) {
    case "full":
      return "Full";
    case "maintenance":
      return "Maintenance";
    case "avail_single":
      return "Single · Available";
    case "avail_shared":
      return "Shared · Available";
    case "partial":
      return `Partial (${freeBeds} free)`;
    default:
      return "Unavailable";
  }
}

export function occBarColor(status: SeatmapVisualStatus): string {
  if (status === "avail_single" || status === "avail_shared") return "#22c55e";
  if (status === "partial") return "#f59e0b";
  return "rgba(255,255,255,0.3)";
}

export function pipColorForStatus(status: SeatmapVisualStatus): string {
  switch (status) {
    case "avail_single":
      return "#22c55e";
    case "avail_shared":
      return "#3b82f6";
    case "partial":
      return "#f59e0b";
    case "full":
    case "maintenance":
    default:
      return "rgba(255,255,255,0.15)";
  }
}

export function isTileInteractive(status: SeatmapVisualStatus): boolean {
  return status !== "full" && status !== "maintenance";
}

export function seatmapRoomToCardData(room: PublicSeatmapRoom): RoomCardData {
  return {
    id: room.id,
    room_number: room.room_number,
    floor: room.floor,
    occupancy_display: room.occupancy_display,
    availability_label: room.availability_label,
    sharing_label: room.sharing_label,
    monthly_rent_per_bed: room.monthly_rent_per_bed,
    amenities: room.amenities,
  };
}
