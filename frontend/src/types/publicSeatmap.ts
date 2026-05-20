export type SeatmapVisualStatus =
  | "avail_single"
  | "avail_shared"
  | "partial"
  | "full"
  | "maintenance";

export interface PublicSeatmapRoom {
  id: number;
  room_number: string;
  floor: string;
  occupancy_limit: number;
  current_occupancy: number;
  occupancy_display: string;
  availability_label: string;
  sharing_label: string;
  sharing: "single" | "shared";
  visual_status: SeatmapVisualStatus;
  selectable: boolean;
  free_beds: number;
  room_status: string;
  monthly_rent_per_bed?: string | number | null;
  amenities?: string[];
}

export interface PublicSeatmapFloor {
  key: string;
  label: string;
  sort_order: number;
  available_count: number;
  rooms: PublicSeatmapRoom[];
}

export interface PublicSeatmapSummary {
  total_rooms: number;
  available_rooms: number;
  free_beds: number;
  full_rooms: number;
}

export interface PublicSeatmapPayload {
  schema_version: string;
  tenant: { slug: string; name: string };
  summary: PublicSeatmapSummary;
  floors: PublicSeatmapFloor[];
}
