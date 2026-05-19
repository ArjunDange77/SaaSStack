import { Link } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSbOperatorDashboard } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="sb-kpi-card">
      <div className="sb-kpi-label">{label}</div>
      <div className="sb-kpi-value">{value}</div>
      {sub ? <div className="sb-kpi-sub muted">{sub}</div> : null}
    </div>
  );
}

export function SbDashboard() {
  const { tenantSlug } = useAuth();
  const { data, isLoading, error } = useSbOperatorDashboard();
  useDocumentTitle(`School Bus — ${tenantSlug}`);

  if (isLoading) {
    return (
      <div className="sb-dashboard">
        <PageHeader title="School Bus Command Center" subtitle="Loading operations…" />
        <div className="sb-kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="sb-kpi-card sb-kpi-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p className="error">{apiErrorMessage(error, "Could not load dashboard.")}</p>
        {isAuthError(error) && (
          <p>
            <Link to="/login">Sign in again</Link>
          </p>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="sb-dashboard">
      <PageHeader title="School Bus Command Center" subtitle="Morning operations overview" />
      <div className="sb-kpi-grid">
        <KpiCard label="Active buses" value={data.active_buses} />
        <KpiCard label="Ongoing trips" value={data.ongoing_trips} />
        <KpiCard label="Students onboard" value={data.students_onboard} />
        <KpiCard label="Absent today" value={data.absent_students_today} />
        <KpiCard label="Overdue fees" value={data.overdue_fees_count} />
        <KpiCard label="Incidents today" value={data.incidents_today} />
      </div>
      <div className="sb-kpi-row-secondary">
        <KpiCard label="Collected today" value={`₹${data.total_collected_today}`} />
        <KpiCard label="Pending fees" value={`₹${data.pending_fees_total}`} />
        <KpiCard label="Students" value={data.total_students} />
        <KpiCard label="Drivers" value={data.total_drivers} />
      </div>
      <div className="sb-tables">
        <section className="sb-panel">
          <h2>Late routes</h2>
          {data.late_routes.length === 0 ? (
            <p className="muted">All routes on schedule.</p>
          ) : (
            <ul className="sb-list">
              {data.late_routes.map((r) => (
                <li key={r.id}>
                  {r.route__name} — <span className="badge">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="sb-panel">
          <h2>Pending collections</h2>
          {data.pending_collections.length === 0 ? (
            <p className="muted">No pending fees.</p>
          ) : (
            <ul className="sb-list">
              {data.pending_collections.map((f) => (
                <li key={f.id}>
                  {f.student__full_name} — ₹{f.amount} ({f.month}) due {f.due_date}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="sb-panel sb-panel-wide">
          <h2>Recent incidents</h2>
          {data.recent_incidents.length === 0 ? (
            <p className="muted">No incidents logged.</p>
          ) : (
            <ul className="sb-list">
              {data.recent_incidents.map((inc) => (
                <li key={inc.id}>
                  <strong>{inc.category || "incident"}</strong> ({inc.severity}) — {inc.description}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="muted sb-quick-links">
        Manage data via <Link to="/r/sb-students">Students</Link>,{" "}
        <Link to="/r/sb-routes">Routes</Link>, <Link to="/r/sb-drivers">Drivers</Link>.
      </p>
    </div>
  );
}
