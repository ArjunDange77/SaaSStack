import { useEffect, useState } from "react";
import type { PublicSeatmapRoom } from "@/types/publicSeatmap";
import {
  isTileInteractive,
  pulseClassForStatus,
  selectedClassForStatus,
  tileClassForStatus,
} from "@/lib/seatmapStatus";

interface Props {
  room: PublicSeatmapRoom;
  selected?: boolean;
  onHover?: (room: PublicSeatmapRoom | null) => void;
  onSelect?: (room: PublicSeatmapRoom) => void;
}

export function RoomTile({ room, selected, onHover, onSelect }: Props) {
  const [pulse, setPulse] = useState(false);
  const interactive = isTileInteractive(room.visual_status);
  const statusClass = selected
    ? selectedClassForStatus(room.visual_status)
    : tileClassForStatus(room.visual_status);

  useEffect(() => {
    if (!selected) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 550);
    return () => window.clearTimeout(t);
  }, [selected, room.id]);

  const label = `Room ${room.room_number}, ${room.occupancy_display} occupied`;
  const inner = (
    <>
      <span className="rt-num">{room.room_number}</span>
      <span className="rt-occ">{room.occupancy_display}</span>
      {pulse && <span className={pulseClassForStatus(room.visual_status)} aria-hidden />}
    </>
  );

  if (!interactive) {
    return (
      <div className={`room-tile ${statusClass}`} role="img" aria-label={label}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`room-tile ${statusClass}`}
      aria-label={label}
      aria-pressed={selected ?? false}
      onMouseEnter={() => onHover?.(room)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(room)}
      onBlur={() => onHover?.(null)}
      onClick={() => onSelect?.(room)}
    >
      {inner}
    </button>
  );
}
