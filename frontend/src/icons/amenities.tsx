const AMENITY_LABELS: Record<string, string> = {
  ac: "AC",
  wifi: "WiFi",
  attached_bath: "Attached bath",
};

export function amenityLabel(key: string): string {
  return AMENITY_LABELS[key] ?? key.replace(/_/g, " ");
}

export function AmenityTags({ keys }: { keys: string[] }) {
  if (!keys.length) return null;
  return (
    <div className="amenity-tags">
      {keys.map((k) => (
        <span key={k} className="amenity-tag">
          {amenityLabel(k)}
        </span>
      ))}
    </div>
  );
}
