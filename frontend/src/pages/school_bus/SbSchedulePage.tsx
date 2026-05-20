import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "@/api/client";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSbHolidays, useSbTripsGenerate } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
const IST = "Asia/Kolkata";

function ymdIST(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: IST });
}

function monthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  const pad = first.getDay();
  for (let i = 0; i < pad; i++) {
    days.unshift(new Date(year, month, -pad + i + 1));
  }
  return days;
}

export function SbSchedulePage() {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));
  const [msg, setMsg] = useState("");
  const generate = useSbTripsGenerate();

  const start = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-01`;
  const endDate = new Date(viewMonth.year, viewMonth.month + 1, 0);
  const end = ymdIST(endDate);

  const { data: holidays = [], refetch } = useSbHolidays(start, end);
  const holidaySet = useMemo(
    () => new Set(holidays.map((h) => h.holiday_date)),
    [holidays]
  );

  useDocumentTitle("Trip schedule");

  const days = monthDays(viewMonth.year, viewMonth.month);

  const toggleHoliday = async (ymd: string) => {
    setMsg("");
    const existing = holidays.find((h) => h.holiday_date === ymd);
    try {
      if (existing) {
        await api.delete("/sb/operator/holidays/", { params: { id: existing.id } });
      } else {
        await api.post("/sb/operator/holidays/", { holiday_date: ymd, name: "Holiday" });
      }
      await refetch();
    } catch (err) {
      setMsg(apiErrorMessage(err, "Could not update holiday."));
    }
  };

  const onGenerate = async (daysCount: number) => {
    setMsg("");
    try {
      const result = await generate.mutateAsync(daysCount);
      setMsg(`Generated ${result.created} trip(s).`);
    } catch (err) {
      setMsg(apiErrorMessage(err, "Could not generate trips."));
    }
  };

  const prevMonth = () => {
    setViewMonth((m) => {
      const d = new Date(m.year, m.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const nextMonth = () => {
    setViewMonth((m) => {
      const d = new Date(m.year, m.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="sb-schedule-page">
      <Breadcrumbs
        crumbs={[
          { label: "Command center", to: "/sb/dashboard" },
          { label: "Schedule" },
        ]}
      />
      <PageHeader
        title="Trip schedule"
        subtitle="Mark holidays (no trips generated) and generate weekday trips."
      />

      <div className="sb-schedule-toolbar">
        <button type="button" className="secondary" onClick={prevMonth}>
          ←
        </button>
        <strong>{monthLabel}</strong>
        <button type="button" className="secondary" onClick={nextMonth}>
          →
        </button>
        <button
          type="button"
          className="sb-driver-btn-primary"
          disabled={generate.isPending}
          onClick={() => onGenerate(7)}
        >
          Generate week
        </button>
        <button
          type="button"
          className="secondary"
          disabled={generate.isPending}
          onClick={() => onGenerate(30)}
        >
          Generate month
        </button>
      </div>
      {msg && <p className="muted">{msg}</p>}

      <p className="muted sb-schedule-hint">
        Click a weekday to toggle holiday. Weekends are skipped automatically.{" "}
        <Link to="/sb/trips?tab=all">View all trips →</Link>
      </p>

      <div className="sb-schedule-calendar" role="grid" aria-label={monthLabel}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="sb-schedule-dow">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const ymd = ymdIST(d);
          const inMonth = d.getMonth() === viewMonth.month;
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          const isHoliday = holidaySet.has(ymd);
          return (
            <button
              key={ymd}
              type="button"
              className={`sb-schedule-day ${!inMonth ? "sb-schedule-day--muted" : ""} ${
                isHoliday ? "sb-schedule-day--holiday" : ""
              } ${weekend ? "sb-schedule-day--weekend" : ""}`}
              disabled={!inMonth || weekend}
              onClick={() => inMonth && !weekend && toggleHoliday(ymd)}
              title={weekend ? "Weekend" : isHoliday ? "Holiday — click to remove" : "Click to mark holiday"}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
