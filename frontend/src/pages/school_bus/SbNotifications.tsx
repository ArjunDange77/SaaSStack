import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
import { EmptyState } from "@/components/school_bus/EmptyState";
import { SbPageHeader } from "@/components/school_bus/SbPageHeader";
import { StatusBadge } from "@/components/school_bus/StatusBadge";
import { useSbOperatorNotifications } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatISTDateTime } from "@/utils/datetime";

function EventBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, " ");
  return <span className="sb-event-badge">{label}</span>;
}

export function SbNotifications() {
  const { data, isLoading, error } = useSbOperatorNotifications();
  const [eventFilter, setEventFilter] = useState("All events");
  const [statusFilter, setStatusFilter] = useState("All status");
  useDocumentTitle("School Bus — Notifications");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (eventFilter !== "All events") {
      rows = rows.filter((r) => r.event_type === eventFilter.toLowerCase().replace(/ /g, "_"));
    }
    if (statusFilter !== "All status") {
      rows = rows.filter((r) => r.status === statusFilter.toLowerCase());
    }
    return rows;
  }, [data, eventFilter, statusFilter]);

  if (isLoading) return <p className="muted">Loading notifications…</p>;
  if (error) return <p className="error">{apiErrorMessage(error, "Could not load notifications.")}</p>;

  return (
    <div className="sb-dashboard">
      <SbPageHeader title="Notifications" subtitle="Outbound messages to parents" />
      <div className="sb-att-filters">
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option>All events</option>
          <option>pickup_confirmed</option>
          <option>fee_reminder</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All status</option>
          <option>sent</option>
          <option>pending</option>
          <option>failed</option>
          <option>demo</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="Notifications appear when drivers mark attendance or you send fee reminders."
        />
      ) : (
        <div className="table-wrap">
          <table className="sb-notif-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Student</th>
                <th>Parent</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id}>
                  <td>{formatISTDateTime(n.created_at)}</td>
                  <td>
                    <EventBadge type={n.event_type} />
                  </td>
                  <td>{n.student_name}</td>
                  <td>{n.to_phone_masked}</td>
                  <td>{n.channel}</td>
                  <td>
                    <StatusBadge status={n.status} />
                  </td>
                  <td>
                    {n.whatsapp_url ? (
                      <a href={n.whatsapp_url} target="_blank" rel="noreferrer" className="wa-btn">
                        Open WhatsApp →
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted sb-quick-links">
        <Link to="/sb/dashboard">← Command center</Link>
      </p>
    </div>
  );
}
