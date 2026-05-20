export type StatusColorStyle = { bg: string; text: string; dot: string };

export interface StatusBadgeProps {
  status: string;
  label?: string;
  colorMap?: Record<string, StatusColorStyle>;
}

const DEFAULT_LABEL = (status: string) => status.replace(/_/g, " ");

export function StatusBadge({ status, label, colorMap }: StatusBadgeProps) {
  const text = label ?? DEFAULT_LABEL(status);
  if (colorMap?.[status]) {
    const c = colorMap[status];
    return (
      <span
        className="status-badge"
        style={{ background: c.bg, color: c.text }}
      >
        <span className="status-dot" style={{ background: c.dot }} aria-hidden />
        {text}
      </span>
    );
  }
  return (
    <span className={`status-badge status-${status.replace(/-/g, "_")}`}>
      <span className="status-dot" aria-hidden />
      {text}
    </span>
  );
}
