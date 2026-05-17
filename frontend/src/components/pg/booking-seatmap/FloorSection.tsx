import type { PublicSeatmapFloor, PublicSeatmapRoom } from "@/types/publicSeatmap";
import { RoomTile } from "./RoomTile";

interface Props {
  floor: PublicSeatmapFloor;
  selectedRoomId: number | null;
  onHover: (room: PublicSeatmapRoom | null) => void;
  onSelect: (room: PublicSeatmapRoom) => void;
  sectionRef?: (el: HTMLElement | null) => void;
}

export function FloorSection({
  floor,
  selectedRoomId,
  onHover,
  onSelect,
  sectionRef,
}: Props) {
  return (
    <section
      id={`floor-${floor.key}`}
      className="floor-block"
      ref={sectionRef}
      aria-labelledby={`floor-heading-${floor.key}`}
    >
      <h3 className="floor-heading" id={`floor-heading-${floor.key}`}>
        Floor {floor.label} · {floor.available_count} available
      </h3>
      <div className="rooms-wrap">
        {floor.rooms.map((room) => (
          <RoomTile
            key={room.id}
            room={room}
            selected={selectedRoomId === room.id}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
