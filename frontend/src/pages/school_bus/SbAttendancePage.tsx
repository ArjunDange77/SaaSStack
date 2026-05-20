import { useMemo, useState } from "react";
import { IconDownload } from "@tabler/icons-react";
import { api, apiErrorMessage } from "@/api/client";
import { AlertBanner } from "@/components/school_bus/AlertBanner";
import { Avatar } from "@/components/school_bus/Avatar";
import { MonthPicker } from "@/components/school_bus/MonthPicker";
import { SbPageHeader } from "@/components/school_bus/SbPageHeader";
import { SegmentedControl } from "@/components/school_bus/SegmentedControl";
import { StatCard } from "@/components/school_bus/StatCard";
import { StatRow } from "@/components/school_bus/StatRow";
import { StatusBadge } from "@/components/school_bus/StatusBadge";
import { useSbAttendanceHistory, useSbAttendanceSummary } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { currentMonthYm } from "@/utils/datetime";
import type { SbAttendanceSummaryStudent } from "@/hooks/useSchoolBus";

function rateColor(rate: number): string {
  if (rate >= 0.9) return "sb-rate-high";
  if (rate >= 0.75) return "sb-rate-mid";
  return "sb-rate-low";
}

function StudentAttendanceRow({ student }: { student: SbAttendanceSummaryStudent }) {
  const pct = Math.round(student.attendance_rate * 100);
  return (
    <div className="sb-student-att-row">
      <Avatar name={student.name} />
      <div className="sb-student-att-info">
        <div className="sb-student-att-name">
          <strong>{student.name}</strong>
          {student.is_low_attendance && (
            <span className="overdue-badge">Low attendance</span>
          )}
        </div>
        <span className="muted">
          {student.stop_name}
          {student.route_name ? ` · ${student.route_name}` : ""}
        </span>
      </div>
      <div className="sb-att-dots" aria-label="Last 10 school days">
        {student.attendance_dots.map((d, i) => (
          <span
            key={i}
            className={`sb-att-dot sb-att-dot-${d === "present" ? "present" : d === "absent" ? "absent" : "none"}`}
            title={d}
          />
        ))}
      </div>
      <span className={`sb-att-pct ${rateColor(student.attendance_rate)}`}>{pct}%</span>
    </div>
  );
}

export function SbAttendancePage() {
  const [view, setView] = useState("By student");
  const [month, setMonth] = useState(currentMonthYm());
  const [route, setRoute] = useState("all");
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useSbAttendanceSummary(month, route);
  const { data: history } = useSbAttendanceHistory(200);
  useDocumentTitle("Attendance");

  const students = useMemo(() => {
    const list = data?.students ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }, [data, search]);

  const handleExport = async () => {
    const res = await api.get("/sb/operator/attendance/export/", {
      params: { month, route, format: "csv" },
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <p className="muted">Loading attendance…</p>;
  if (error) return <p className="error">{apiErrorMessage(error, "Could not load attendance.")}</p>;

  const monthLabel = month;

  return (
    <div className="sb-dashboard">
      <SbPageHeader
        title="Attendance"
        subtitle={`${monthLabel} · ${route === "all" ? "All routes" : `Route ${route}`}`}
        actions={
          <>
            <SegmentedControl
              options={["By student", "By date", "By route"]}
              value={view}
              onChange={setView}
            />
            <button type="button" className="secondary" onClick={() => void handleExport()}>
              <IconDownload size={14} aria-hidden /> Export
            </button>
          </>
        }
      />
      {data && (
        <StatRow>
          <StatCard label="School days" value={data.stats.school_days} />
          <StatCard
            label="Avg attendance"
            value={`${Math.round(data.stats.avg_attendance_rate * 100)}%`}
            valueColor="success"
          />
          <StatCard label="Total absences" value={data.stats.total_absences} valueColor="danger" />
          <StatCard
            label="Needs attention"
            value={`${data.stats.low_attendance_count} students`}
            valueColor="warning"
          />
        </StatRow>
      )}
      <div className="sb-att-filters">
        <input
          type="search"
          placeholder="Search student…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sb-att-search"
        />
        <select value={route} onChange={(e) => setRoute(e.target.value)} aria-label="Route">
          <option value="all">All routes</option>
        </select>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      {data && data.low_attendance_students.length > 0 && (
        <AlertBanner color="warning">
          {data.low_attendance_students.length} students below 75% attendance —{" "}
          {data.low_attendance_students.map((s) => s.name).join(", ")}
        </AlertBanner>
      )}
      {view === "By student" &&
        students.map((s) => <StudentAttendanceRow key={s.id} student={s} />)}
      {view !== "By student" && history && history.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Route</th>
                <th>Student</th>
                <th>Pickup</th>
                <th>Drop</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{row.trip_date}</td>
                  <td>{row.route_name}</td>
                  <td>{row.student_name}</td>
                  <td>
                    <StatusBadge status={row.pickup_status} />
                  </td>
                  <td>
                    <StatusBadge status={row.drop_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
