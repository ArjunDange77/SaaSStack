import { Link } from "react-router-dom";
import { IconBell } from "@tabler/icons-react";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { CommandTile } from "@/components/pg/CommandTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { pgQuickActions } from "@/config/pgQuickActions";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePgDashboard } from "@/hooks/useResource";
import { kpiSubtext } from "@/lib/kpiSubtext";

function CommandTileSkeleton({ sm }: { sm?: boolean }) {
  return (
    <div
      className={`command-tile command-tile-skeleton${sm ? " command-tile-sm" : " command-tile-lg"}`}
      aria-hidden
    />
  );
}

export function PgDashboard() {
  const { tenantSlug } = useAuth();
  const { data, isLoading, error } = usePgDashboard();
  useDocumentTitle(`Command center — ${tenantSlug} | SaaSStack`);

  if (isLoading) {
    return (
      <div className="pg-dashboard">
        <PageHeader title="Command center" subtitle="Loading your property overview…" />
        <div className="command-center-grid command-center-grid-primary">
          {Array.from({ length: 5 }).map((_, i) => (
            <CommandTileSkeleton key={i} />
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

  const trends = data?.trends ?? {};
  const occupancy = data?.occupancy_rate ?? 0;
  const pendingBookings = data?.pending_bookings ?? 0;
  const rentOverdue = data?.rent_overdue ?? 0;
  const openComplaints = data?.open_complaints ?? 0;
  const quickActions = pgQuickActions(tenantSlug);
  const kpiCtx = {
    total_rooms: data?.total_rooms,
    rooms_available: data?.rooms_available,
  };

  const subtitle = data?.as_of
    ? `Today at a glance · As of ${data.as_of}`
    : "Today at a glance";

  return (
    <div className="pg-dashboard">
      <PageHeader title="Command center" subtitle={subtitle} />

      <section className="command-center" aria-label="Key metrics">
        <div className="command-center-grid command-center-grid-primary">
          <CommandTile
            to="/r/pg-rooms"
            value={`${occupancy}%`}
            label="Occupancy"
            trend={trends.occupancy_rate}
          />
          <CommandTile
            to="/r/pg-rooms?room_status=available"
            value={data?.rooms_available ?? 0}
            label="Available rooms"
            subtext={kpiSubtext("available_rooms", kpiCtx) ?? undefined}
          />
          <CommandTile
            to="/r/pg-booking-requests?status=pending"
            value={pendingBookings}
            label="Pending bookings"
            highlight={pendingBookings > 0}
            valueTone={pendingBookings > 0 ? "warn" : "default"}
            trend={trends.pending_bookings}
            subtext={
              pendingBookings > 0
                ? (kpiSubtext("pending_bookings", kpiCtx) ?? undefined)
                : undefined
            }
          />
          <CommandTile
            to="/r/pg-rent-records?overdue=true"
            value={rentOverdue}
            label="Overdue rent"
            highlight={rentOverdue > 0}
            valueTone={rentOverdue === 0 ? "success" : "warn"}
            trend={trends.rent_overdue}
            subtext={
              rentOverdue === 0 ? (kpiSubtext("rent_overdue", kpiCtx) ?? undefined) : undefined
            }
          />
          <CommandTile
            to="/r/pg-complaints?status=open"
            value={openComplaints}
            label="Open complaints"
            highlight={openComplaints > 0}
            valueTone={openComplaints === 0 ? "success" : "warn"}
            trend={trends.open_complaints}
            subtext={
              openComplaints === 0
                ? (kpiSubtext("open_complaints", kpiCtx) ?? undefined)
                : undefined
            }
          />
        </div>

        {pendingBookings > 0 && (
          <Link to="/r/pg-booking-requests?status=pending" className="alert-banner">
            <span>
              <IconBell size={16} stroke={1.75} style={{ verticalAlign: "middle" }} aria-hidden />{" "}
              {pendingBookings} pending booking request{pendingBookings === 1 ? "" : "s"} — review
              now
            </span>
            <span className="alert-banner-cta">Review bookings →</span>
          </Link>
        )}

        <p className="section-eyebrow">More detail</p>
        <div className="command-center-grid command-center-grid-secondary">
          <CommandTile
            size="sm"
            to="/r/pg-residents?active_status=active"
            value={data?.active_residents ?? 0}
            label="Active residents"
          />
          <CommandTile
            size="sm"
            to="/r/pg-rent-records?paid_status=unpaid"
            value={data?.rent_due_unpaid ?? 0}
            label="Unpaid rent"
            valueTone={(data?.rent_due_unpaid ?? 0) > 0 ? "warn" : "default"}
          />
          <CommandTile
            size="sm"
            to="/r/pg-rooms?room_status=occupied"
            value={data?.occupied_rooms ?? 0}
            label="Occupied rooms"
          />
          <CommandTile
            size="sm"
            to="/r/pg-rooms?full=1"
            value={data?.rooms_full ?? 0}
            label="Full rooms"
          />
          <CommandTile
            size="sm"
            to="/r/pg-rooms?room_status=maintenance"
            value={data?.rooms_maintenance ?? 0}
            label="Maintenance"
            valueTone={(data?.rooms_maintenance ?? 0) === 0 ? "success" : "default"}
          />
        </div>
      </section>

      <p className="section-eyebrow">Quick actions</p>
      <div className="quick-actions" role="toolbar" aria-label="Quick actions">
        {quickActions.map((a) => {
          const Icon = a.icon;
          const inner = (
            <>
              <Icon size={15} stroke={1.75} aria-hidden />
              {a.label}
            </>
          );
          return a.external ? (
            <a key={a.label} href={a.to} className="ui-btn ui-btn-qa" target="_blank" rel="noreferrer">
              {inner}
            </a>
          ) : (
            <Link key={a.label} to={a.to} className="ui-btn ui-btn-qa">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
