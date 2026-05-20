export function GPSMapPlaceholder({
  title = "Live GPS",
  subtitle = "GPS tracking is not enabled in this pilot.",
  visible = true,
  lastLocation,
}: {
  title?: string;
  subtitle?: string;
  visible?: boolean;
  lastLocation?: { latitude: string; longitude: string; recorded_at?: string } | null;
}) {
  if (!visible) return null;

  return (
    <section className="sb-gps-placeholder" aria-label={title}>
      <div className="sb-gps-placeholder-map">
        <span className="sb-gps-placeholder-pin" aria-hidden>
          📍
        </span>
        <p className="sb-gps-placeholder-title">{title}</p>
        <p className="muted sb-gps-placeholder-sub">{subtitle}</p>
        {lastLocation ? (
          <p className="sb-gps-coords muted">
            {lastLocation.latitude}, {lastLocation.longitude}
            {lastLocation.recorded_at ? ` · ${new Date(lastLocation.recorded_at).toLocaleTimeString()}` : ""}
          </p>
        ) : null}
      </div>
    </section>
  );
}
