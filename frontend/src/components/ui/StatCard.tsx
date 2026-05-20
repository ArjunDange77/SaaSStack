interface Props {
  label: string;
  value: string | number;
  valueColor?: "default" | "success" | "danger" | "warning";
}

export function StatCard({ label, value, valueColor = "default" }: Props) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className={`stat-value stat-value-${valueColor}`}>{value}</p>
    </div>
  );
}
