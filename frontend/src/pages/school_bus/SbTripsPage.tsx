import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
import { ResourceList } from "@/components/engine/ResourceList";
import { FilterPills } from "@/components/school_bus/FilterPills";
import { SbPageHeader } from "@/components/school_bus/SbPageHeader";
import { StatCard } from "@/components/school_bus/StatCard";
import { StatRow } from "@/components/school_bus/StatRow";
import { TripCard } from "@/components/school_bus/trips/TripCard";
import { TripRow } from "@/components/school_bus/trips/TripRow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  useSbOperatorTripsByDate,
  useSbOperatorTripsToday,
  useSbTripSummary,
  useSbTripsGenerate,
} from "@/hooks/useSchoolBus";
import { useResourceSchema } from "@/hooks/useResource";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { assertSupportedSchemaVersion } from "@/types/metadata";
import { formatISTDate, todayYmdIST } from "@/utils/datetime";

const ACTIVE = new Set(["pickup_in_progress", "started", "delayed", "scheduled"]);
const FILTERS = ["All", "In progress", "Completed", "Delayed", "Route 1", "Route 2"];
const TAB_OPTIONS = ["Today", "All trips"];

function matchesFilter(trip: { status: string; route_name: string }, filter: string): boolean {
  if (filter === "All") return true;
  if (filter === "In progress") return ACTIVE.has(trip.status);
  if (filter === "Completed") return trip.status === "completed";
  if (filter === "Delayed") return trip.status === "delayed";
  if (filter.startsWith("Route")) return trip.route_name.startsWith(filter);
  return true;
}

function tabFromParams(params: URLSearchParams): "today" | "all" {
  return params.get("tab") === "all" ? "all" : "today";
}

export function SbTripsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFromParams(searchParams);
  const [filter, setFilter] = useState("All");
  const [generateMsg, setGenerateMsg] = useState("");
  const [summaryTripId, setSummaryTripId] = useState<number | null>(null);
  const today = todayYmdIST();
  const { data: todayData, isLoading, error, refetch } = useSbOperatorTripsToday();
  const { data: historyData } = useSbOperatorTripsByDate(
    tab === "today" ? today : undefined
  );
  const generate = useSbTripsGenerate();
  const { data: summary } = useSbTripSummary(summaryTripId);
  const { data: tripsSchema, isLoading: schemaLoading } = useResourceSchema("sb-trips");
  useDocumentTitle("Today's trips");

  const setTab = (label: string) => {
    const next = new URLSearchParams(searchParams);
    if (label === "All trips") {
      next.set("tab", "all");
    } else {
      next.delete("tab");
    }
    setSearchParams(next, { replace: true });
  };

  const trips =
    tab === "all" ? (historyData?.trips ?? []) : (todayData?.trips ?? []);
  const stats = todayData?.stats;
  const filtered = useMemo(
    () => trips.filter((t) => matchesFilter(t, filter)),
    [trips, filter]
  );
  const active = filtered.filter((t) => ACTIVE.has(t.status));
  const past = filtered.filter((t) => !ACTIVE.has(t.status));

  const subtitle =
    tab === "today" && todayData
      ? `${formatISTDate(today)} · ${active.length} active, ${past.length} completed`
      : tab === "all"
        ? "Search, filter, and manage all trip records"
        : "";

  const runGenerate = async (days: number, label: string) => {
    setGenerateMsg("");
    try {
      const result = await generate.mutateAsync(days);
      setGenerateMsg(`${label}: ${result.created} trip day(s) created.`);
      await refetch();
    } catch (err) {
      setGenerateMsg(apiErrorMessage(err, "Could not generate trips."));
    }
  };

  const generateActions =
    tab === "today" ? (
      <>
        <button
          type="button"
          className="secondary"
          disabled={generate.isPending}
          onClick={() => runGenerate(1, "Today")}
        >
          Generate today
        </button>
        <button
          type="button"
          className="secondary"
          disabled={generate.isPending}
          onClick={() => runGenerate(7, "This week")}
        >
          Generate week
        </button>
        <button
          type="button"
          className="secondary"
          disabled={generate.isPending}
          onClick={() => runGenerate(31, "This month")}
        >
          Generate month
        </button>
      </>
    ) : null;

  if (tab === "all") {
    if (schemaLoading) return <p className="muted">Loading trips…</p>;
    if (!tripsSchema) return <p className="error">Could not load trips schema.</p>;
    assertSupportedSchemaVersion(tripsSchema);

    return (
      <div className="sb-dashboard sb-trips-page">
        <SbPageHeader title="Today's trips" subtitle={subtitle} />
        <div className="sb-trips-tabs" role="tablist" aria-label="Trips views">
          <SegmentedControl
            options={TAB_OPTIONS}
            value={tab === "all" ? "All trips" : "Today"}
            onChange={setTab}
          />
        </div>
        <ResourceList
          slug="sb-trips"
          schema={tripsSchema}
          embedded
          hideHeader
          rowPath={(id) => `/sb/trips/${id}`}
        />
      </div>
    );
  }

  if (isLoading) return <p className="muted">Loading trips…</p>;
  if (error) return <p className="error">{apiErrorMessage(error, "Could not load trips.")}</p>;

  return (
    <div className="sb-dashboard sb-trips-page">
      <SbPageHeader title="Today's trips" subtitle={subtitle} actions={generateActions} />
      <div className="sb-trips-tabs" role="tablist" aria-label="Trips views">
        <SegmentedControl
          options={TAB_OPTIONS}
          value="Today"
          onChange={setTab}
        />
      </div>
      {generateMsg ? <p className="muted sb-generate-msg">{generateMsg}</p> : null}
      <p className="muted sb-trips-hint">
        Trips are auto-generated on weekdays (skipping weekends and tenant holidays). Use the{" "}
        <strong>All trips</strong> tab to create, edit, or delete individual trips.
      </p>
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
            <div key={trip.id} className="sb-trip-row-wrap">
              <TripRow trip={trip} />
              {trip.status === "completed" && (
                <button
                  type="button"
                  className="sb-summary-chip"
                  onClick={() => setSummaryTripId(trip.id)}
                >
                  Summary
                </button>
              )}
            </div>
          ))}
        </>
      )}
      {summaryTripId != null && (
        <div className="sb-summary-drawer" role="dialog" aria-labelledby="trip-summary-title">
          <div className="sb-summary-drawer-panel">
            <header>
              <h2 id="trip-summary-title">Trip summary</h2>
              <button type="button" className="sb-summary-close" onClick={() => setSummaryTripId(null)}>
                Close
              </button>
            </header>
            {summary ? (
              <dl className="sb-summary-dl">
                <dt>Route</dt>
                <dd>{summary.route_name}</dd>
                <dt>Duration</dt>
                <dd>{summary.duration_minutes != null ? `${summary.duration_minutes} min` : "—"}</dd>
                <dt>Attendance</dt>
                <dd>
                  {summary.present_count} present, {summary.absent_count} absent,{" "}
                  {summary.not_marked_count} not marked
                </dd>
                <dt>GPS coverage</dt>
                <dd>{summary.gps_coverage_pct}%</dd>
                <dt>Incidents</dt>
                <dd>{summary.incident_count}</dd>
              </dl>
            ) : (
              <p className="muted">Loading summary…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
