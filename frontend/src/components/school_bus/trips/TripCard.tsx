import { IconBus } from "@tabler/icons-react";
import { StatusBadge } from "@/components/school_bus/StatusBadge";
import { ProgressBar } from "@/components/school_bus/ProgressBar";
import { formatISTTime } from "@/utils/datetime";
import type { SbOperatorTrip } from "@/hooks/useSchoolBus";

interface Props {
  trip: SbOperatorTrip;
}

export function TripCard({ trip }: Props) {
  const progress =
    trip.total_stops > 0
      ? Math.round(((trip.current_stop_index + 1) / trip.total_stops) * 100)
      : 0;
  const startedLabel = trip.started_at ? formatISTTime(trip.started_at) : "";

  return (
    <article className="sb-trip-card">
      <div className="sb-trip-card-head">
        <div className="sb-trip-card-title-row">
          <div className="sb-trip-bus-icon" aria-hidden>
            <IconBus size={18} />
          </div>
          <div>
            <p className="sb-trip-route-name">{trip.route_name}</p>
            <p className="muted sb-trip-meta">
              {trip.driver_name} · {trip.bus_registration}
              {startedLabel ? ` · Started ${startedLabel}` : ""}
            </p>
          </div>
        </div>
        <StatusBadge status={trip.status} />
      </div>
      <ProgressBar
        value={progress}
        label={`Stop ${trip.current_stop_index + 1} of ${trip.total_stops} — ${trip.current_stop_name}`}
      />
      <p className="muted sb-trip-onboard">
        {trip.students_onboard}/{trip.total_students} onboard · {trip.absent_count} absent
      </p>
      {trip.stops.length > 0 && (
        <div className="stop-timeline">
          {trip.stops.slice(0, 4).map((stop, i) => (
            <div
              key={`${stop.name}-${i}`}
              className={`stop-item${stop.completed ? " done" : ""}${stop.current ? " current" : ""}`}
            >
              <span className="stop-name">
                {stop.name}
                {stop.completed ? " ✓" : ""}
                {stop.current ? " · now" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
