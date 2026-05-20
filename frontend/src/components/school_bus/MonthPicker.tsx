import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

interface Props {
  value: string;
  onChange: (ym: string) => void;
}

export function MonthPicker({ value, onChange }: Props) {
  return (
    <div className="month-picker">
      <button type="button" className="month-picker-btn" aria-label="Previous month" onClick={() => onChange(shiftMonth(value, -1))}>
        <IconChevronLeft size={16} />
      </button>
      <span className="month-picker-label">{formatMonthLabel(value)}</span>
      <button type="button" className="month-picker-btn" aria-label="Next month" onClick={() => onChange(shiftMonth(value, 1))}>
        <IconChevronRight size={16} />
      </button>
    </div>
  );
}
