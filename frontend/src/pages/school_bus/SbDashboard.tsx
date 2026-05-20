import { Link } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { ActionItemList } from "@/components/school_bus/ActionItemList";
import { MorningBriefingBanner } from "@/components/school_bus/MorningBriefingBanner";
import { LiveBusMap } from "@/components/school_bus/LiveBusMap";
import { TripProgressCard } from "@/components/school_bus/TripProgressCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSbLiveFleet, useSbOperatorBriefing } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="sb-kpi-card">
      <div className="sb-kpi-label">{label}</div>
      <div className="sb-kpi-value">{value}</div>
    </div>
  );
}

function OperatorLiveFleet() {
  const { data: fleet, isLoading } = useSbLiveFleet();
  const withLocation = (fleet ?? []).filter((t) => t.last_location != null);

  if (isLoading) return <p className="muted">Loading live fleet…</p>;
  if (!fleet?.length) {
    return <p className="muted">No active trips right now.</p>;
  }

  const first = withLocation[0]?.last_location;
  return (
    <section className="sb-live-fleet">
      {first && withLocation.length === 1 ? (
        <LiveBusMap
          latitude={first.latitude}
          longitude={first.longitude}
          label={withLocation[0].route_name}
          stale={withLocation[0].stale}
          lastUpdated={first.recorded_at}
          height={220}
        />
      ) : null}
      <ul className="sb-live-fleet-list">
        {fleet.map((t) => (
          <li key={t.trip_id} className="sb-live-fleet-item">
            <div className="sb-live-fleet-line">
              <strong>{t.route_name}</strong>
              <span className="muted"> · {t.bus_fleet_number}</span>
            </div>
            <div className="sb-live-fleet-chips">
              <span className={`sb-trip-chip sb-trip-chip--${t.status}`}>
                {t.status.replace(/_/g, " ")}
              </span>
              {t.gps_stale && <span className="sb-live-fleet-warn">No GPS</span>}
              {t.not_started && <span className="sb-live-fleet-warn">Not started</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
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
          <h2>
            Today&apos;s trips{" "}
            <Link to="/sb/trips" className="sb-view-all-link">
              View all →
            </Link>
          </h2>
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
          <h2 className="sb-live-fleet-heading">Live fleet</h2>
          <OperatorLiveFleet />
        </div>
        <aside className="sb-briefing-side">
          <h2>Action items</h2>
          <ActionItemList items={data.action_items} />
        </aside>
      </div>

      <p className="muted">
        <Link to="/sb/schedule">Trip schedule & holidays →</Link>
      </p>
    </div>
  );
}
