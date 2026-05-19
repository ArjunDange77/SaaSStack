import { Link } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSbAttendanceHistory } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatIST } from "@/utils/datetime";

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

export function SbAttendanceHistory() {
  const { data, isLoading, error } = useSbAttendanceHistory();
  useDocumentTitle("Attendance history");

  return (
    <div className="sb-dashboard">
      <PageHeader
        title="Attendance history"
        subtitle="Recent pickup and drop marks across trips"
      />
      <p className="muted sb-quick-links">
        <Link to="/sb/dashboard">← Command center</Link>
      </p>
      {isLoading && <p className="muted">Loading…</p>}
      {error && <p className="error">{apiErrorMessage(error, "Could not load attendance.")}</p>}
      {data && data.length === 0 && <p className="muted">No attendance records yet.</p>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Route</th>
                <th>Student</th>
                <th>Pickup</th>
                <th>Drop</th>
                <th>Marked</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>{row.trip_date}</td>
                  <td>{row.route_name}</td>
                  <td>{row.student_name}</td>
                  <td>
                    <span className="badge">{statusLabel(row.pickup_status)}</span>
                  </td>
                  <td>
                    <span className="badge">{statusLabel(row.drop_status)}</span>
                  </td>
                  <td className="muted">
                    {row.marked_at ? formatIST(row.marked_at) : "—"}
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
