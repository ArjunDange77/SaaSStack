import type { SbCalendarDay } from "@/hooks/useSchoolBus";

function parseDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return { day: d.getDate(), weekday: d.getDay() };
}

export function AttendanceCalendar({
  days,
  monthLabel,
}: {
  days: SbCalendarDay[];
  monthLabel?: string;
}) {
  const first = days[0]?.date;
  const yearMonth = first ? first.slice(0, 7) : "";
  const [y, m] = yearMonth.split("-").map(Number);
  const startPad = y && m ? new Date(y, m - 1, 1).getDay() : 0;
  const byDay = new Map(days.map((d) => [parseDate(d.date).day, d]));

  const cells: { day: number | null; entry?: SbCalendarDay }[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ day: null });
  const lastDay = y && m ? new Date(y, m, 0).getDate() : 31;
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ day: d, entry: byDay.get(d) });
  }

  return (
    <section className="sb-attendance-calendar" aria-label={monthLabel ?? "Attendance calendar"}>
      {monthLabel ? <h3 className="sb-calendar-title">{monthLabel}</h3> : null}
      <div className="sb-calendar-weekdays">
        {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
          <span key={`${w}-${i}`} className="sb-calendar-weekday">
            {w}
          </span>
        ))}
      </div>
      <div className="sb-calendar-grid">
        {cells.map((cell, i) => (
          <div
            key={cell.day ?? `pad-${i}`}
            className={`sb-calendar-cell${cell.day == null ? " sb-calendar-cell--pad" : ""}`}
          >
            {cell.day != null ? (
              <>
                <span className="sb-calendar-day-num">{cell.day}</span>
                <span
                  className={`sb-calendar-dot sb-calendar-dot--${cell.entry?.status ?? "none"}`}
                  title={cell.entry?.reason?.replace(/_/g, " ") ?? undefined}
                />
              </>
            ) : null}
          </div>
        ))}
      </div>
      <div className="sb-calendar-legend">
        <span>
          <span className="sb-calendar-dot sb-calendar-dot--present" /> Present
        </span>
        <span>
          <span className="sb-calendar-dot sb-calendar-dot--absent" /> Absent
        </span>
        <span>
          <span className="sb-calendar-dot sb-calendar-dot--none" /> No data
        </span>
      </div>
    </section>
  );
}
