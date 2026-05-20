import { useMemo, useState } from "react";
import { IconCalendar } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
import { FilterPills } from "@/components/school_bus/FilterPills";
import { SbPageHeader } from "@/components/school_bus/SbPageHeader";
import { StatCard } from "@/components/school_bus/StatCard";
import { StatRow } from "@/components/school_bus/StatRow";
import { TripCard } from "@/components/school_bus/trips/TripCard";
import { TripRow } from "@/components/school_bus/trips/TripRow";
import { useSbOperatorTripsByDate, useSbOperatorTripsToday } from "@/hooks/useSchoolBus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatISTDate, todayYmdIST } from "@/utils/datetime";

const ACTIVE = new Set(["pickup_in_progress", "started", "delayed", "scheduled"]);
const FILTERS = ["All", "In progress", "Completed", "Delayed", "Route 1", "Route 2"];

function matchesFilter(trip: { status: string; route_name: string }, filter: string): boolean {
  if (filter === "All") return true;
  if (filter === "In progress") return ACTIVE.has(trip.status);
  if (filter === "Completed") return trip.status === "completed";
  if (filter === "Delayed") return trip.status === "delayed";
  if (filter.startsWith("Route")) return trip.route_name.startsWith(filter);
  return true;
}

export function SbTripsPage() {
  const [showAllDates, setShowAllDates] = useState(false);
  const [filter, setFilter] = useState("All");
  const today = todayYmdIST();
  const { data: todayData, isLoading, error } = useSbOperatorTripsToday();
  const { data: historyData } = useSbOperatorTripsByDate(
    showAllDates ? today : undefined
  );
  useDocumentTitle("Today's trips");

  const trips = showAllDates ? historyData?.trips ?? [] : todayData?.trips ?? [];
  const stats = todayData?.stats;
  const filtered = useMemo(
    () => trips.filter((t) => matchesFilter(t, filter)),
    [trips, filter]
  );
  const active = filtered.filter((t) => ACTIVE.has(t.status));
  const past = filtered.filter((t) => !ACTIVE.has(t.status));

  const subtitle = todayData
    ? `${formatISTDate(today)} · ${active.length} active, ${past.length} completed`
    : "";

  if (isLoading) return <p className="muted">Loading trips…</p>;
  if (error) return <p className="error">{apiErrorMessage(error, "Could not load trips.")}</p>;

  return (
    <div className="sb-dashboard">
      <SbPageHeader
        title="Today's trips"
        subtitle={subtitle}
        actions={
          <button
            type="button"
            className="secondary"
            onClick={() => setShowAllDates((v) => !v)}
          >
            <IconCalendar size={14} aria-hidden /> {showAllDates ? "Today" : "All trips"}
          </button>
        }
      />
      {stats && (
        <StatRow>
          <StatCard label="Students today" value={stats.total_students} />
          <StatCard label="Absent" value={stats.absent_count} valueColor="danger" />
          <StatCard label="Avg duration" value={`${stats.avg_duration_minutes} min`} />
          <StatCard
            label="On time rate"
            value={`${stats.on_time_rate}%`}
            valueColor={stats.on_time_rate >= 90 ? "success" : "warning"}
          />
        </StatRow>
      )}
      <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
      {active.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
      {past.length > 0 && (
        <>
          <p className="sb-date-divider">Earlier today</p>
          {past.map((trip) => (
            <TripRow key={trip.id} trip={trip} />
          ))}
        </>
      )}
      <p className="muted sb-quick-links">
        <Link to="/sb/dashboard">← Command center</Link>
      </p>
    </div>
  );
}
