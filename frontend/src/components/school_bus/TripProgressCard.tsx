export interface TripProgress {
  id: number;
  route_name: string;
  driver_name: string;
  onboard: number;
  total: number;
  stop_index: number;
  stop_total: number;
  elapsed: string;
  completed_at_display?: string;
  status: string;
}

export function TripProgressCard({ trip }: { trip: TripProgress }) {
  const isCompleted = trip.status === "completed";
  const pct = trip.stop_total ? Math.round((trip.stop_index / trip.stop_total) * 100) : 0;

  return (
    <article className="sb-trip-progress-card">
      <header>
        <h3>{trip.route_name}</h3>
        <span className={`sb-trip-chip sb-trip-chip--${trip.status}`}>
          {trip.status.replace(/_/g, " ")}
        </span>
      </header>
      <p className="muted">{trip.driver_name}</p>
      {isCompleted ? (
        <>
          <p>Transported {trip.onboard} students</p>
          {trip.completed_at_display ? (
            <p className="muted">Completed at {trip.completed_at_display}</p>
          ) : null}
        </>
      ) : (
        <>
          <p>
            Onboard {trip.onboard}/{trip.total}
            {trip.elapsed ? ` · ${trip.elapsed}` : ""}
          </p>
          <div className="sb-progress-bar" aria-label={`Stop ${trip.stop_index} of ${trip.stop_total}`}>
            <div className="sb-progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="muted sb-progress-label">
            Stop {trip.stop_index} of {trip.stop_total}
          </p>
        </>
      )}
    </article>
  );
}
