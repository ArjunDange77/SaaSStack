import { StatusBadge } from "@/components/school_bus/StatusBadge";
import { formatDuration, formatISTTime } from "@/utils/datetime";
import type { SbOperatorTrip } from "@/hooks/useSchoolBus";

interface Props {
  trip: SbOperatorTrip;
}

export function TripRow({ trip }: Props) {
  const timeRange =
    trip.started_at && trip.completed_at
      ? `${formatISTTime(trip.started_at)} → ${formatISTTime(trip.completed_at)}`
      : trip.started_at
        ? formatISTTime(trip.started_at)
        : "—";
  const duration =
    trip.started_at && trip.duration_minutes != null
      ? `${trip.duration_minutes} min`
      : trip.started_at
        ? formatDuration(trip.started_at, trip.completed_at)
        : "";

  return (
    <div className="sb-trip-row">
      <StatusBadge status={trip.status} />
      <div className="sb-trip-row-main">
        <strong>{trip.route_name}</strong>
        <span className="muted">
          {trip.driver_name} · {timeRange}
          {duration ? ` · ${duration}` : ""}
        </span>
      </div>
      <span className="muted">
        {trip.total_students} students
        {trip.incident_count > 0 ? ` · ${trip.incident_count} incidents` : ""}
      </span>
    </div>
  );
}
