import { Badge, badgeToneFromLabel } from "@/components/ui/Badge";
import { AmenityTags } from "@/icons/amenities";

export interface RoomCardData {
  id: number;
  room_number: string;
  floor: string;
  occupancy_display: string;
  availability_label: string;
  sharing_label?: string;
  monthly_rent_per_bed?: string | number | null;
  amenities?: string[];
}

function cardClassForLabel(label: string): string {
  if (label === "Maintenance") return "room-card-maintenance";
  if (label === "Full") return "room-card-full";
  if (label === "Available") return "room-card-available";
  return "room-card-occupied";
}

function formatRent(amount: string | number | null | undefined): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const n = Number(amount);
  if (Number.isNaN(n)) return null;
  return `₹${n.toLocaleString("en-IN")} / bed / mo`;
}

interface Props {
  room: RoomCardData;
  onClick?: () => void;
  selected?: boolean;
  as?: "button" | "div";
}

export function RoomCard({ room, onClick, selected, as = "button" }: Props) {
  const className = [
    "pg-room-card",
    cardClassForLabel(room.availability_label),
    selected ? "pg-room-card-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rentLabel = formatRent(room.monthly_rent_per_bed);

  const inner = (
    <>
      <div className="pg-room-card-header">
        <strong className="pg-room-card-title">Room {room.room_number}</strong>
        <Badge tone={badgeToneFromLabel(room.availability_label)}>{room.availability_label}</Badge>
      </div>
      <p className="muted pg-room-card-floor">Floor {room.floor}</p>
      {rentLabel && <p className="pg-room-card-price">{rentLabel}</p>}
      <p className="pg-room-card-meta">
        {room.occupancy_display} occupied
        {room.sharing_label ? ` · ${room.sharing_label}` : ""}
      </p>
      {room.amenities && room.amenities.length > 0 && (
        <AmenityTags keys={room.amenities} />
      )}
    </>
  );

  if (as === "div" || !onClick) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  );
}
