import { useRef } from "react";
import { Badge, badgeToneFromLabel } from "@/components/ui/Badge";
import { AmenityTags } from "@/icons/amenities";
import type { RoomCardData } from "./RoomCard";

const DOUBLE_TAP_MS = 400;

function formatRent(amount: string | number | null | undefined): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const n = Number(amount);
  if (Number.isNaN(n)) return null;
  return `₹${n.toLocaleString("en-IN")}`;
}

interface Props {
  room: RoomCardData;
  selected?: boolean;
  onSelect: () => void;
  onConfirm?: () => void;
}

export function BookingRoomRow({ room, selected, onSelect, onConfirm }: Props) {
  const price = formatRent(room.monthly_rent_per_bed);
  const lastTapRef = useRef<{ id: number; at: number } | null>(null);

  const handleClick = () => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (
      onConfirm &&
      last &&
      last.id === room.id &&
      now - last.at < DOUBLE_TAP_MS
    ) {
      lastTapRef.current = null;
      onConfirm();
      return;
    }
    lastTapRef.current = { id: room.id, at: now };
    onSelect();
  };

  const label = `Room ${room.room_number}, Floor ${room.floor}. Double-click to continue with this room.`;

  return (
    <button
      type="button"
      className={`booking-room-row${selected ? " selected" : ""}`}
      onClick={handleClick}
      onDoubleClick={() => onConfirm?.()}
      aria-label={label}
      aria-pressed={selected ?? false}
    >
      <div>
        <p className="br-name">Room {room.room_number}</p>
        <p className="br-detail">
          Floor {room.floor} · {room.occupancy_display} occupied
        </p>
        {room.amenities && room.amenities.length > 0 && (
          <AmenityTags keys={room.amenities} />
        )}
      </div>
      <div>
        {price && (
          <>
            <p className="br-price">{price}</p>
            <p className="br-price-label">per month</p>
          </>
        )}
        <Badge tone={badgeToneFromLabel(room.availability_label)}>{room.availability_label}</Badge>
      </div>
    </button>
  );
}
