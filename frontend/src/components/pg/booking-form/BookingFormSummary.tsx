import {
  estimateBookingTotal,
  formatEstimatedTotal,
} from "@/lib/bookingFormUtils";
import type { DurationScrollState } from "@/types/publicBookingForm";
import type { RoomCardData } from "@/components/pg/RoomCard";
import { composeDuration } from "@/lib/publicBookingValidation";

interface Props {
  room: RoomCardData | null;
  durationScroll: DurationScrollState;
}

export function BookingFormSummary({ room, durationScroll }: Props) {
  const durationLabel = composeDuration(durationScroll.qty, durationScroll.unit);
  const total = room
    ? estimateBookingTotal(
        room.monthly_rent_per_bed,
        durationScroll.qty,
        durationScroll.unit
      )
    : null;
  const showTotal = durationScroll.unit === "month" && total != null;

  return (
    <div className="booking-summary">
      <p className="bs-title">Booking summary</p>
      <div className="bs-row">
        <span className="bs-key">Room</span>
        <span className="bs-val">{room ? `Room ${room.room_number}` : "Not selected"}</span>
      </div>
      {room?.sharing_label && (
        <div className="bs-row">
          <span className="bs-key">Type</span>
          <span className="bs-val">{room.sharing_label}</span>
        </div>
      )}
      <div className="bs-row">
        <span className="bs-key">Duration</span>
        <span className="bs-val">{durationLabel}</span>
      </div>
      {showTotal && (
        <div className="bs-total">
          <span className="bs-total-key">Estimated total</span>
          <span className="bs-total-val">{formatEstimatedTotal(total)}</span>
        </div>
      )}
    </div>
  );
}
