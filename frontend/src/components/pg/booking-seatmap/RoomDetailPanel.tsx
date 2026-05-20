// seatmap-v2: room photo carousel in this panel when API exposes photo_url
import { IconHandClick } from "@tabler/icons-react";
import { AmenityTags } from "@/icons/amenities";
import {
  badgeClassForStatus,
  badgeTextForStatus,
  isTileInteractive,
  occBarColor,
} from "@/lib/seatmapStatus";
import type { PublicSeatmapRoom } from "@/types/publicSeatmap";

function formatRent(amount: string | number | null | undefined): string | null {
  if (amount === null || amount === undefined || amount === "") return null;
  const n = Number(amount);
  if (Number.isNaN(n)) return null;
  return `₹${n.toLocaleString("en-IN")}`;
}

interface Props {
  room: PublicSeatmapRoom | null;
  floorLabel?: string;
  onSelect?: () => void;
  onChooseLater?: () => void;
  mobileSheet?: boolean;
}

export function RoomDetailPanel({
  room,
  floorLabel,
  onSelect,
  onChooseLater,
  mobileSheet,
}: Props) {
  const showCard = room != null;

  return (
    <div className={`rp-panel${mobileSheet ? " rp-panel-sheet" : ""}`}>
      <div className="rp-top" aria-live="polite">
        {!showCard && (
          <div className="rp-hint">
            <IconHandClick size={24} stroke={1.5} aria-hidden />
            <p>Hover a room to preview, click to select</p>
          </div>
        )}
        {showCard && room && (
          <div className="rp-card visible">
            <div className="rp-room-num">Room {room.room_number}</div>
            <div className="rp-floor">Floor {floorLabel ?? room.floor}</div>
            <div className={badgeClassForStatus(room.visual_status)}>
              {badgeTextForStatus(room.visual_status, room.free_beds)}
            </div>
            {formatRent(room.monthly_rent_per_bed) && (
              <>
                <div className="rp-price">{formatRent(room.monthly_rent_per_bed)}</div>
                <div className="rp-price-sub">per month</div>
              </>
            )}
            <div className="rp-divider" />
            <p className="rp-row">
              {room.current_occupancy} of {room.occupancy_limit} occupied
            </p>
            <div className="rp-occ-bar">
              <div
                className="rp-occ-fill"
                style={{
                  width: `${Math.round((room.current_occupancy / room.occupancy_limit) * 100)}%`,
                  background: occBarColor(room.visual_status),
                }}
              />
            </div>
            <p className="rp-row">
              {room.sharing === "single" ? "Single room" : "Shared room"}
            </p>
            {room.amenities && room.amenities.length > 0 && (
              <div className="rp-amenities">
                <AmenityTags keys={room.amenities} />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="rp-bottom">
        {showCard && room && isTileInteractive(room.visual_status) && (
          <button type="button" className="btn-book visible" onClick={onSelect}>
            Select Room {room.room_number} →
          </button>
        )}
        <button type="button" className="btn-later" data-testid="choose-later-btn" onClick={onChooseLater}>
          I&apos;ll choose later
        </button>
      </div>
    </div>
  );
}
