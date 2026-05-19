import type { SbNotificationRow } from "@/hooks/useSchoolBus";
import { formatIST } from "@/utils/datetime";

export function NotificationLogTable({ rows }: { rows: SbNotificationRow[] }) {
  if (rows.length === 0) {
    return <p className="muted">No notifications sent yet.</p>;
  }

  return (
    <div className="sb-notif-table-wrap">
      <table className="sb-notif-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Student</th>
            <th>Event</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatIST(row.created_at, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
              <td>{row.student_name || "—"}</td>
              <td>
                <div>{row.event_type.replace(/_/g, " ")}</div>
                <div className="muted sb-notif-preview">{row.body_preview}</div>
              </td>
              <td>
                <span className={`sb-notif-status sb-notif-status--${row.status}`}>{row.status}</span>
              </td>
              <td>
                {row.whatsapp_url ? (
                  <a
                    className="sb-driver-btn sb-driver-btn-sm"
                    href={row.whatsapp_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                ) : (
                  <span className="muted">{row.to_phone_masked}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
