import type { RoomCardData } from "./RoomCard";

interface Props {
  room: RoomCardData;
  onContinue: () => void;
  onChooseLater: () => void;
  onClear: () => void;
}

export function BookingListActionBar({ room, onContinue, onChooseLater, onClear }: Props) {
  return (
    <div
      className="booking-list-action-bar"
      role="region"
      aria-live="polite"
      aria-label="Room selection actions"
    >
      <p className="booking-list-action-summary">
        Room {room.room_number} · Floor {room.floor}
      </p>
      <div className="booking-list-action-buttons">
        <button type="button" className="continue-btn" onClick={onContinue}>
          Continue
        </button>
        <button type="button" className="ui-btn ui-btn-ghost" onClick={onClear}>
          Change room
        </button>
      </div>
      <button type="button" className="skip-btn ui-btn ui-btn-ghost" onClick={onChooseLater}>
        I&apos;ll choose a room later
      </button>
    </div>
  );
}
