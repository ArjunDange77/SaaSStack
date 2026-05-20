type Tone = "available" | "full" | "occupied" | "maintenance" | "success" | "warning" | "danger" | "neutral";

interface Props {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

const TONE_CLASS: Record<Tone, string> = {
  available: "badge-available",
  full: "badge-full",
  occupied: "badge-occupied",
  maintenance: "badge-maintenance",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  neutral: "badge-neutral",
};

export function Badge({ tone = "neutral", children, className = "" }: Props) {
  return (
    <span className={["status-badge", TONE_CLASS[tone], className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}

export function badgeToneFromLabel(label: string): Tone {
  const l = label.toLowerCase();
  if (l === "available") return "available";
  if (l === "full") return "full";
  if (l === "maintenance") return "maintenance";
  if (l === "occupied") return "occupied";
  return "neutral";
}
