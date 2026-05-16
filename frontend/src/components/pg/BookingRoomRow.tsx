import { Badge, badgeToneFromLabel } from "@/components/ui/Badge";
import { AmenityTags } from "@/icons/amenities";
import type { RoomCardData } from "./RoomCard";

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
}

export function BookingRoomRow({ room, selected, onSelect }: Props) {
  const price = formatRent(room.monthly_rent_per_bed);

  return (
    <button
      type="button"
      className={`booking-room-row${selected ? " selected" : ""}`}
      onClick={onSelect}
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
