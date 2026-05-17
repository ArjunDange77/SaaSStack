import { pipColorForStatus } from "@/lib/seatmapStatus";
import type { PublicSeatmapFloor } from "@/types/publicSeatmap";

interface Props {
  floors: PublicSeatmapFloor[];
  activeFloorKey: string | null;
  onFloorSelect: (floorKey: string) => void;
  variant?: "sidebar" | "chips";
}

export function FloorNavPips({
  floors,
  activeFloorKey,
  onFloorSelect,
  variant = "sidebar",
}: Props) {
  const wrapClass = variant === "chips" ? "floor-chips" : "left-nav";

  return (
    <nav className={wrapClass} aria-label="Floors">
      {floors.map((floor, index) => (
        <div key={floor.key} className="floor-pip-wrap">
          <button
            type="button"
            className={`floor-pip${activeFloorKey === floor.key ? " active" : ""}`}
            onClick={() => onFloorSelect(floor.key)}
            aria-label={`Floor ${floor.label}, ${floor.available_count} available`}
            aria-current={activeFloorKey === floor.key ? "true" : undefined}
          >
            <span className="fp-num">{floor.label}</span>
            <span className="fp-dots" aria-hidden>
              {floor.rooms.map((room) => (
                <span
                  key={room.id}
                  className="fp-dot"
                  style={{ background: pipColorForStatus(room.visual_status) }}
                />
              ))}
            </span>
          </button>
          {variant === "sidebar" && index < floors.length - 1 && (
            <div className="fp-divider" aria-hidden />
          )}
        </div>
      ))}
    </nav>
  );
}
