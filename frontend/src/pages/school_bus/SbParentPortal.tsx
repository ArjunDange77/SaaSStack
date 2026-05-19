import { apiErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { PortalCardSkeleton } from "@/components/pg/PortalCardSkeleton";
import { useSbParentMe } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function feeBadge(status: string, overdue: string): string {
  if (status === "paid") return "Paid";
  if (parseFloat(overdue) > 0) return `₹${overdue} overdue`;
  return "Fee due";
}

export function SbParentPortal() {
  const { logout } = useAuth();
  const { data, isLoading, error } = useSbParentMe();
  useDocumentTitle("My children");

  if (isLoading) {
    return (
      <div className="portal-page">
        <header className="portal-header">
          <div>
            <h1>School Bus</h1>
            <p className="muted">Loading…</p>
          </div>
        </header>
        <PortalCardSkeleton />
        <PortalCardSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-page">
        <p className="error">{apiErrorMessage(error, "Could not load your children.")}</p>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </div>
    );
  }

  const greeting = firstName(data.parent.full_name);

  return (
    <div className="portal-page">
      <header className="portal-header">
        <div>
          <h1>School Bus</h1>
          <p className="portal-greeting">Hello, {greeting}</p>
        </div>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </header>

      {(data.reminders.length > 0 || data.recent_incidents.length > 0) && (
        <section className="portal-card sb-parent-alerts">
          <h2>Alerts</h2>
          {data.reminders.map((r) => (
            <p key={r.id} className="sb-alert-banner">
              <strong>{r.title}</strong> — {r.body}
            </p>
          ))}
          {data.recent_incidents.map((inc) => (
            <p key={inc.id} className="sb-alert-banner sb-alert-banner--incident">
              <strong>{inc.category || "Incident"}</strong> ({inc.severity}): {inc.description}
            </p>
          ))}
        </section>
      )}

      {data.children.length === 0 ? (
        <p className="muted">No children linked to your account.</p>
      ) : (
        data.children.map((child) => (
          <article key={child.id} className="portal-card">
            <h2>{child.full_name}</h2>
            <p className="muted">
              {child.route_name} · Bus {child.bus_number}
            </p>
            <p>
              Pickup: {child.pickup_stop} — <span className="badge">{child.pickup_status}</span>
            </p>
            <p>
              Drop: {child.drop_stop} — <span className="badge">{child.drop_status}</span>
            </p>
            <p>
              <span className={`sb-fee-badge sb-fee-badge--${child.fee_status}`}>
                {feeBadge(child.fee_status, child.fee_overdue_amount)}
              </span>
            </p>
          </article>
        ))
      )}

      <p className="muted portal-link">
        Questions? Contact your transport operator.
      </p>
    </div>
  );
}
