import { Link } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { ActionItemList } from "@/components/school_bus/ActionItemList";
import { MorningBriefingBanner } from "@/components/school_bus/MorningBriefingBanner";
import { TripProgressCard } from "@/components/school_bus/TripProgressCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSbOperatorBriefing } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="sb-kpi-card">
      <div className="sb-kpi-label">{label}</div>
      <div className="sb-kpi-value">{value}</div>
    </div>
  );
}

export function SbDashboard() {
  const { tenantSlug } = useAuth();
  const { data, isLoading, error, dataUpdatedAt, isFetching } = useSbOperatorBriefing();
  useDocumentTitle(`School Bus — ${tenantSlug}`);

  const secondsAgo = dataUpdatedAt ? Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000)) : 0;

  if (isLoading) {
    return (
      <div className="sb-dashboard">
        <PageHeader title="School Bus Command Center" subtitle="Loading briefing…" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p className="error">{apiErrorMessage(error, "Could not load briefing.")}</p>
        {isAuthError(error) && (
          <p>
            <Link to="/login">Sign in again</Link>
          </p>
        )}
      </div>
    );
  }

  if (!data) return null;
  const d = data.dashboard;

  return (
    <div className="sb-dashboard sb-dashboard--briefing">
      <PageHeader
        title="School Bus Command Center"
        subtitle={
          <>
            {data.greeting}
            <span className="sb-refresh-age muted">
              {isFetching ? " · Updating…" : ` · Updated ${secondsAgo}s ago`}
            </span>
          </>
        }
      />
      <MorningBriefingBanner level={data.banner.level} message={data.banner.message} />

      <div className="sb-briefing-layout">
        <div className="sb-briefing-main">
          <h2>Today&apos;s trips</h2>
          {data.trips.length === 0 ? (
            <p className="muted">No trips scheduled today.</p>
          ) : (
            <div className="sb-trip-cards">
              {data.trips.map((t) => (
                <TripProgressCard key={t.id} trip={t} />
              ))}
            </div>
          )}
          <div className="sb-kpi-grid sb-kpi-grid--compact">
            <KpiCard label="Onboard" value={d.students_onboard} />
            <KpiCard label="Absent" value={d.absent_students_today} />
            <KpiCard label="Overdue fees" value={d.overdue_fees_count} />
            <KpiCard label="Incidents" value={d.incidents_today} />
          </div>
        </div>
        <aside className="sb-briefing-side">
          <h2>Action items</h2>
          <ActionItemList items={data.action_items} />
        </aside>
      </div>

      <p className="muted sb-quick-links">
        <Link to="/sb/fees">Fees</Link>
        {" · "}
        <Link to="/sb/notifications">Notifications</Link>
        {" · "}
        <Link to="/sb/attendance">Attendance</Link>
      </p>
    </div>
  );
}
