import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  to: string;
  value: string | number;
  label: string;
  highlight?: boolean;
  icon?: ReactNode;
}

export function CommandTile({ to, value, label, highlight, icon }: Props) {
  return (
    <Link
      to={to}
      className={`command-tile${highlight ? " command-tile-highlight" : ""}`}
    >
      {icon && <span className="command-tile-icon">{icon}</span>}
      <span className="command-tile-value">{value}</span>
      <span className="command-tile-label">{label}</span>
    </Link>
  );
}
