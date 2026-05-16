import { Link } from "react-router-dom";
import { Badge, badgeToneFromLabel } from "@/components/ui/Badge";
import type { RoomCardData } from "./RoomCard";

function parseOccupancy(display: string): { current: number; max: number; pct: number } {
  const m = display.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return { current: 0, max: 1, pct: 0 };
  const current = Number(m[1]);
  const max = Math.max(1, Number(m[2]));
  return { current, max, pct: Math.round((current / max) * 100) };
}

interface Props {
  room: RoomCardData;
  slug: string;
}

export function OperatorRoomCard({ room, slug }: Props) {
  const { current, max, pct } = parseOccupancy(room.occupancy_display);
  const occClass = current >= max && max > 0 ? "occ-full" : "occ-partial";

  return (
    <article className="operator-room-card">
      <div className="room-card-header">
        <div>
          <div className="room-num">Room {room.room_number}</div>
          <p className="room-floor">Floor {room.floor}</p>
        </div>
        <Badge tone={badgeToneFromLabel(room.availability_label)}>{room.availability_label}</Badge>
      </div>
      <div className={`occ-bar-wrap ${occClass}`}>
        <div className="occ-bar-label">
          <span>Occupancy</span>
          <span>{room.occupancy_display}</span>
        </div>
        <div className="occ-bar-track">
          <div className="occ-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="room-meta-row">
        {room.sharing_label ?? "—"}
        <span aria-hidden> · </span>
        {room.availability_label}
      </p>
      <div className="room-actions">
        <Link to={`/r/${slug}/${room.id}`} className="btn-sm btn-sm-primary">
          Open
        </Link>
        <Link to={`/r/${slug}/${room.id}?edit=1`} className="btn-sm">
          Edit
        </Link>
      </div>
    </article>
  );
}
