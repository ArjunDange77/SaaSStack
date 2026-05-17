import type { PublicSeatmapSummary } from "@/types/publicSeatmap";

interface Props {
  summary: PublicSeatmapSummary;
}

const STATS: { key: keyof PublicSeatmapSummary; label: string }[] = [
  { key: "total_rooms", label: "Total rooms" },
  { key: "available_rooms", label: "Available" },
  { key: "free_beds", label: "Free beds" },
  { key: "full_rooms", label: "Full" },
];

export function SeatMapStatsBar({ summary }: Props) {
  return (
    <div className="stats-bar" role="group" aria-label="Property availability summary">
      {STATS.map(({ key, label }) => (
        <div key={key} className="stat">
          <div className="stat-num">{summary[key]}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
