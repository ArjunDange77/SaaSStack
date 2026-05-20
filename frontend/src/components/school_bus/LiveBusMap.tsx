import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface LiveBusMapProps {
  latitude?: string | number | null;
  longitude?: string | number | null;
  label?: string;
  stale?: boolean;
  height?: number | string;
  lastUpdated?: string;
  emptyMessage?: string;
}

function parseCoord(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export function LiveBusMap({
  latitude,
  longitude,
  label = "Bus",
  stale = false,
  height = 200,
  lastUpdated,
  emptyMessage = "Waiting for the driver to share GPS…",
}: LiveBusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);

  useEffect(() => {
    if (!containerRef.current || lat == null || lng == null) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([lat, lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(mapRef.current);
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 10,
        color: "#16a34a",
        fillColor: "#22c55e",
        fillOpacity: 0.9,
        weight: 2,
      })
        .addTo(mapRef.current)
        .bindTooltip(label, { permanent: false });
    } else {
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
      markerRef.current?.setLatLng([lat, lng]);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [lat, lng, label]);

  if (lat == null || lng == null) {
    return (
      <section className="sb-gps-placeholder" aria-label="Bus location">
        <div className="sb-gps-placeholder-map">
          <p className="sb-gps-placeholder-title">Location unavailable</p>
          <p className="sb-gps-placeholder-sub">{emptyMessage}</p>
        </div>
      </section>
    );
  }

  const updatedLabel = lastUpdated
    ? `Last updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : null;

  return (
    <section className="sb-live-map-wrap" aria-label={label}>
      <div
        ref={containerRef}
        className="sb-live-map"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      />
      <p className={`sb-live-map-meta ${stale ? "sb-live-map-meta--stale" : ""}`}>
        {stale ? "Location unavailable — " : ""}
        {updatedLabel ?? "Live bus position"}
      </p>
    </section>
  );
}

export function LiveFleetMap({
  trips,
  height = 220,
}: {
  trips: {
    trip_id: number;
    route_name: string;
    bus_fleet_number: string;
    last_location: { latitude: string; longitude: string } | null;
  }[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tripKey = trips
    .filter((t) => t.last_location)
    .map((t) => `${t.trip_id}:${t.last_location!.latitude},${t.last_location!.longitude}`)
    .join("|");

  useEffect(() => {
    if (!containerRef.current) return;
    const points: { pos: [number, number]; trip: (typeof trips)[0] }[] = [];
    for (const t of trips) {
      const la = parseCoord(t.last_location?.latitude);
      const lo = parseCoord(t.last_location?.longitude);
      if (la != null && lo != null) points.push({ pos: [la, lo], trip: t });
    }
    if (points.length === 0) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OSM",
      }).addTo(mapRef.current);
    }
    const map = mapRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) map.removeLayer(layer);
    });
    for (const { pos, trip } of points) {
      L.circleMarker(pos, { radius: 8, color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.9 })
        .addTo(map)
        .bindPopup(`${trip.route_name} · ${trip.bus_fleet_number}`);
    }
    map.fitBounds(L.latLngBounds(points.map((p) => p.pos)), { padding: [24, 24], maxZoom: 14 });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [tripKey]);

  const hasPoints = trips.some((t) => {
    const la = parseCoord(t.last_location?.latitude);
    const lo = parseCoord(t.last_location?.longitude);
    return la != null && lo != null;
  });

  if (!hasPoints) {
    return (
      <div className="sb-live-map-empty" style={{ minHeight: height }}>
        <p className="muted">No live buses sharing location right now.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="sb-live-map"
      style={{ height: typeof height === "number" ? `${height}px` : height }}
      aria-label="Live fleet map"
    />
  );
}
