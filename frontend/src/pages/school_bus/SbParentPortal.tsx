import { apiErrorMessage } from "@/api/client";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { AlertDrawer } from "@/components/school_bus/AlertDrawer";
import { AttendanceCalendar } from "@/components/school_bus/AttendanceCalendar";
import { ChildStatusHero } from "@/components/school_bus/ChildStatusHero";
import { GPSMapPlaceholder } from "@/components/school_bus/GPSMapPlaceholder";
import { LiveBusMap } from "@/components/school_bus/LiveBusMap";
import { PortalCardSkeleton } from "@/components/pg/PortalCardSkeleton";
import { useSbParentMe } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function trackingSubtitle(tracking: {
  active: boolean;
  stale: boolean;
  last_location: { recorded_at: string } | null;
}): string {
  if (!tracking.active) {
    return "Live tracking appears when the bus trip is in progress.";
  }
  if (tracking.last_location?.recorded_at) {
    const t = new Date(tracking.last_location.recorded_at).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    if (tracking.stale) {
      return `Location unavailable — last seen ${t}`;
    }
    return `Bus on route · location about every 20 seconds · last updated ${t}`;
  }
  return "Waiting for driver GPS…";
}

function TodayTripSummaryCard({
  summary,
}: {
  summary: NonNullable<import("@/hooks/useSchoolBus").SbTodayTripSummary>;
}) {
  const status = summary.status.replace(/_/g, " ");
  return (
    <section className="sb-parent-today-trip portal-card">
      <h3>Today&apos;s trip</h3>
      <p>
        <strong>{summary.route_name}</strong> · Bus {summary.bus_number}
      </p>
      <p className="muted">
        {status}
        {summary.duration_minutes != null ? ` · ${summary.duration_minutes} min` : ""}
      </p>
      {summary.status === "completed" && summary.present_count != null && (
        <p className="muted">
          {summary.present_count} present, {summary.absent_count ?? 0} absent
        </p>
      )}
    </section>
  );
}

export function SbParentPortal() {
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
        <SignOutButton />
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
        <SignOutButton />
      </header>

      <AlertDrawer alerts={alerts} />

      {data.children.length === 0 ? (
        <p className="muted">No children linked to your account.</p>
      ) : (
        data.children.map((child) => {
          const loc = child.tracking?.last_location;
          const showLiveMap =
            child.tracking?.active && loc != null && !Number.isNaN(Number(loc.latitude));

          return (
            <article key={child.id} className="portal-card sb-parent-child-card">
              <h2 className="sb-parent-child-name">{child.full_name}</h2>
              <ChildStatusHero status={child.hero_status} />
              {child.today_trip_summary && (
                <TodayTripSummaryCard summary={child.today_trip_summary} />
              )}
              {showLiveMap ? (
                <LiveBusMap
                  latitude={loc.latitude}
                  longitude={loc.longitude}
                  label={`Bus for ${child.full_name}`}
                  stale={child.tracking.stale}
                  lastUpdated={loc.recorded_at}
                  height={200}
                />
              ) : (
                <GPSMapPlaceholder
                  title="Bus location"
                  subtitle={trackingSubtitle(child.tracking)}
                  visible={child.tracking?.active ?? true}
                />
              )}
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
          );
        })
      )}

      <p className="muted portal-link">Questions? Contact your transport operator.</p>
    </div>
  );
}
