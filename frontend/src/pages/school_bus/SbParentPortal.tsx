import { apiErrorMessage } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { AlertDrawer } from "@/components/school_bus/AlertDrawer";
import { AttendanceCalendar } from "@/components/school_bus/AttendanceCalendar";
import { ChildStatusHero } from "@/components/school_bus/ChildStatusHero";
import { GPSMapPlaceholder } from "@/components/school_bus/GPSMapPlaceholder";
import { PortalCardSkeleton } from "@/components/pg/PortalCardSkeleton";
import { useSbParentMe } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
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
  const alerts = [
    ...data.reminders.map((r) => ({ id: r.id, title: r.title, body: r.body })),
    ...data.recent_incidents.map((inc) => ({
      id: `inc-${inc.id}`,
      title: inc.category || "Incident",
      body: inc.description,
      variant: "incident" as const,
    })),
  ];
  const monthLabel = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="portal-page sb-parent-page">
      <header className="portal-header">
        <div>
          <h1>School Bus</h1>
          <p className="portal-greeting">Hello, {greeting}</p>
        </div>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </header>

      <AlertDrawer alerts={alerts} />

      {data.children.length === 0 ? (
        <p className="muted">No children linked to your account.</p>
      ) : (
        data.children.map((child) => (
          <article key={child.id} className="portal-card sb-parent-child-card">
            <h2 className="sb-parent-child-name">{child.full_name}</h2>
            <ChildStatusHero status={child.hero_status} />
            <GPSMapPlaceholder
              title="Bus location"
              subtitle="Live tracking will appear here in a future release."
            />
            <AttendanceCalendar days={child.calendar_days} monthLabel={monthLabel} />
            <div className="sb-parent-fees">
              <h3>Fees</h3>
              {child.fees.map((f) => (
                <div key={f.month} className={`sb-fee-pill sb-fee-pill--${f.status}`}>
                  <span>
                    {f.month} — ₹{f.amount}
                  </span>
                  {f.status === "paid" ? (
                    <span className="sb-fee-pill-tag">Paid</span>
                  ) : (
                    <span className="sb-fee-pill-tag sb-fee-pill-tag--due">
                      {f.payment_link_url ? (
                        <a href={f.payment_link_url}>Pay now</a>
                      ) : (
                        "Due"
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </article>
        ))
      )}

      <p className="muted portal-link">Questions? Contact your transport operator.</p>
    </div>
  );
}
