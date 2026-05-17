import { useMemo } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { seatmapGridColumns } from "@/lib/seatmapGrid";
import type { PublicSeatmapFloor, PublicSeatmapRoom } from "@/types/publicSeatmap";
import { RoomTile } from "./RoomTile";

interface Props {
  floor: PublicSeatmapFloor;
  selectedRoomId: number | null;
  onHover: (room: PublicSeatmapRoom | null) => void;
  onSelect: (room: PublicSeatmapRoom) => void;
}

export function FloorSection({
  floor,
  selectedRoomId,
  onHover,
  onSelect,
}: Props) {
  const isMobile = useIsMobile();
  const gridColumns = useMemo(
    () => seatmapGridColumns(floor.rooms.length, isMobile),
    [floor.rooms.length, isMobile]
  );

  return (
    <section
      id={`floor-${floor.key}`}
      className="floor-block"
      aria-labelledby={`floor-heading-${floor.key}`}
    >
      <h3 className="floor-heading" id={`floor-heading-${floor.key}`}>
        Floor {floor.label} · {floor.available_count} available
      </h3>
      <div
        className="rooms-wrap"
        style={{ ["--room-cols" as string]: String(gridColumns) }}
      >
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
