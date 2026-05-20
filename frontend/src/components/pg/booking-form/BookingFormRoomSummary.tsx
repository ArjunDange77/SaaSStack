import { AmenityTags } from "@/icons/amenities";
import { formatRentShort, roomMetaLine } from "@/lib/bookingFormUtils";
import type { RoomCardData } from "@/components/pg/RoomCard";

interface Props {
  room: RoomCardData;
  onChangeRoom: () => void;
}

export function BookingFormRoomSummary({ room, onChangeRoom }: Props) {
  const rent = formatRentShort(room.monthly_rent_per_bed);

  return (
    <div className="room-card">
      <div className="rc-left">
        <div className="rc-num">Room {room.room_number}</div>
        <p className="rc-meta">{roomMetaLine(room)}</p>
        {rent && (
          <p className="rc-price-line">
            <span className="rc-price">{rent}</span>
            <span className="rc-price-sub">/bed/mo</span>
          </p>
        )}
        {room.amenities && room.amenities.length > 0 && (
          <div className="rc-tags">
            <AmenityTags keys={room.amenities} />
          </div>
        )}
        <button type="button" className="change-btn" onClick={onChangeRoom}>
          ← Change room
        </button>
      </div>
      <span className="rc-badge">{room.availability_label}</span>
    </div>
  );
}
