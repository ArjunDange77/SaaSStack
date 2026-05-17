import type { DurationUnit } from "@/lib/publicBookingValidation";
import type { RoomCardData } from "@/components/pg/RoomCard";

export function formatRentShort(amount: string | number | null | undefined): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const n = Number(amount);
  if (Number.isNaN(n)) return null;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function roomMetaLine(room: RoomCardData): string {
  const parts = [`Floor ${room.floor}`];
  if (room.sharing_label) parts.push(room.sharing_label);
  parts.push(`${room.occupancy_display} occupied`);
  return parts.join(" · ");
}

export function estimateBookingTotal(
  rent: string | number | null | undefined,
  qty: number,
  unit: DurationUnit
): number | null {
  if (unit !== "month") return null;
  const n = Number(rent);
  if (Number.isNaN(n) || n <= 0) return null;
  return n * qty;
}

export function formatEstimatedTotal(amount: number | null): string {
  if (amount == null) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}
