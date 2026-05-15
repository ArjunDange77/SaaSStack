export interface RoomCardData {
  id: number;
  room_number: string;
  floor: string;
  occupancy_display: string;
  availability_label: string;
  sharing_label: string;
}

function cardClassForLabel(label: string): string {
  if (label === "Maintenance") return "room-card-maintenance";
  if (label === "Full") return "room-card-full";
  if (label === "Available") return "room-card-available";
  return "room-card-occupied";
}

function badgeTone(label: string): string {
  if (label === "Available") return "success";
  if (label === "Maintenance") return "warning";
  return "neutral";
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

  const inner = (
    <>
      <div className="pg-room-card-header">
        <strong className="pg-room-card-title">Room {room.room_number}</strong>
        <span className={`badge badge-${badgeTone(room.availability_label)}`}>
          {room.availability_label}
        </span>
      </div>
      <p className="muted pg-room-card-floor">Floor {room.floor}</p>
      <p className="pg-room-card-meta">
        {room.occupancy_display} occupied · {room.sharing_label}
      </p>
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
