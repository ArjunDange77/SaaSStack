import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ListFilterMeta, ResourceSchema } from "@/types/metadata";
import { useAuth } from "@/auth/AuthContext";
import { OperatorRoomCard } from "@/components/pg/OperatorRoomCard";
import type { RoomCardData } from "@/components/pg/RoomCard";
import { FilterPill } from "@/components/ui/FilterPill";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useResourceList, useResourceMutations } from "@/hooks/useResource";
import { todayYmdIST } from "@/utils/datetime";
import { DynamicTable } from "./DynamicTable";
import { ResourceForm } from "./ResourceForm";

function createFormInitial(slug: string): Record<string, unknown> | undefined {
  if (slug === "sb-trips") {
    return { status: "scheduled", trip_date: todayYmdIST() };
  }
  return undefined;
}

const ROOM_STATUS_LABEL: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  maintenance: "Maintenance",
};

function rowToRoomCard(row: Record<string, unknown>): RoomCardData {
  const status = String(row.room_status ?? "available");
  return {
    id: Number(row.id),
    room_number: String(row.room_number),
    floor: String(row.floor ?? ""),
    occupancy_display: String(row.occupancy_display ?? "0/1"),
    availability_label: ROOM_STATUS_LABEL[status] ?? status,
    sharing_label: row.sharing_label ? String(row.sharing_label) : undefined,
    monthly_rent_per_bed: row.monthly_rent_per_bed as string | number | null,
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
  };
}

interface Props {
  slug: string;
  schema: ResourceSchema;
  /** Embedded in a product page (e.g. Today's trips → All trips tab). */
  embedded?: boolean;
  /** Hide list page title; parent supplies header. */
  hideHeader?: boolean;
  /** Row navigation path; default `/r/:slug/:id`. */
  rowPath?: (id: string | number) => string;
}

function filtersFromSearchParams(
  searchParams: URLSearchParams,
  listFilters: ListFilterMeta[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of listFilters) {
    const v = searchParams.get(f.param);
    if (v) out[f.param] = v;
  }
  return out;
}

function activeFilterKey(
  filters: Record<string, string>,
  listFilters: ListFilterMeta[]
): string | null {
  for (const f of listFilters) {
    const expected = f.value ?? "true";
    if (filters[f.param] === expected) return `${f.param}=${expected}`;
  }
  return null;
}

export function ResourceList({ slug, schema, embedded = false, hideHeader = false, rowPath }: Props) {
  const navigate = useNavigate();
  const { tenantSlug } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const listViews = schema.list_views ?? ["table"];
  const storageKey = `list-view:${tenantSlug}:${slug}`;
  const [viewMode, setViewMode] = useState<"table" | "grid">(() => {
    if (!listViews.includes("grid")) return "table";
    const saved = localStorage.getItem(storageKey);
    if (saved === "table") return "table";
    if (saved === "grid") return "grid";
    return slug === "pg-rooms" ? "grid" : "table";
  });

  useEffect(() => {
    if (searchParams.get("new") === "1" && schema.capabilities?.create !== false) {
      setShowCreate(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, schema.capabilities?.create, setSearchParams]);
  const listFilters = schema.list_filters ?? [];
  const filterParams = useMemo(
    () => filtersFromSearchParams(searchParams, listFilters),
    [searchParams, listFilters]
  );
  const pageSize = schema.pagination?.page_size ?? 25;
  const { data, isLoading, isFetching } = useResourceList(
    slug,
    debouncedSearch,
    page,
    ordering || undefined,
    filterParams
  );
  const { create } = useResourceMutations(slug, schema);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ordering, filterParams]);

  const rows = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const defaultOrdering = schema.ordering?.default?.[0] ?? "";
  const sortField = defaultOrdering.replace(/^-/, "");
  const activeKey = activeFilterKey(filterParams, listFilters);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const toggleSort = (col: string) => {
    const field = col.replace(/^-/, "");
    setOrdering((prev) => {
      if (prev === `-${field}`) return field;
      if (prev === field) return `-${field}`;
      return `-${field}`;
    });
  };

  const applyFilter = (filter: ListFilterMeta) => {
    const next = new URLSearchParams(searchParams);
    const expected = filter.value ?? "true";
    const key = `${filter.param}=${expected}`;
    if (activeKey === key) {
      next.delete(filter.param);
    } else {
      for (const f of listFilters) {
        next.delete(f.param);
      }
      next.set(filter.param, expected);
    }
    setSearchParams(next, { replace: true });
  };

  const showSbTripsStandaloneChrome = slug === "sb-trips" && !embedded;
  const detailNavigate = rowPath ?? ((id: string | number) => `/r/${slug}/${id}`);
  const canCreate = schema.capabilities?.create !== false && !(showSbTripsStandaloneChrome);

  return (
    <div className={embedded ? "resource-list-embedded" : undefined}>
      {!hideHeader && (
        <header className="page-header">
          <div className="page-header-text">
            <h2 className="resource-list-title page-title">{schema.title}</h2>
            {schema.description && <p className="page-subtitle muted">{schema.description}</p>}
          </div>
        </header>
      )}
      {showSbTripsStandaloneChrome && (
        <div className="sb-crud-trips-banner" role="note">
          <p>
            Trips are auto-generated on weekdays. Use{" "}
            <Link to="/sb/trips">Today&apos;s trips</Link> to generate schedules and view live
            status.
          </p>
        </div>
      )}
      <div
        className={
          slug === "pg-rooms" ? "rooms-toolbar toolbar-responsive" : "toolbar toolbar-responsive"
        }
      >
        <input
          className={slug === "pg-rooms" ? "rooms-search" : undefined}
          placeholder={slug === "pg-rooms" ? "Search rooms…" : "Search"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search"
        />
        {sortField && (
          <select
            className={slug === "pg-rooms" ? "sort-select" : undefined}
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            aria-label="Sort"
          >
            <option value="">Default sort</option>
            <option value={sortField}>{sortField} ↑</option>
            <option value={`-${sortField}`}>{sortField} ↓</option>
          </select>
        )}
        {showSbTripsStandaloneChrome && (
          <Link to="/sb/trips" className="sb-trips-product-link">
            Open Today&apos;s trips →
          </Link>
        )}
        {canCreate && (
          <button
            type="button"
            className={slug === "pg-rooms" ? "new-btn" : undefined}
            onClick={() => setShowCreate(true)}
          >
            {slug === "pg-rooms" ? "+ New room" : slug === "sb-trips" ? "New trip" : "New"}
          </button>
        )}
        {listViews.includes("grid") && (
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={viewMode === "table" ? "active" : ""}
              aria-label="Table view"
              onClick={() => {
                setViewMode("table");
                localStorage.setItem(storageKey, "table");
              }}
            >
              <IconList size={16} stroke={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className={viewMode === "grid" ? "active" : ""}
              aria-label="Grid view"
              onClick={() => {
                setViewMode("grid");
                localStorage.setItem(storageKey, "grid");
              }}
            >
              <IconLayoutGrid size={16} stroke={1.75} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {listFilters.length > 0 && (
        <div className="filter-pills filter-chips" role="group" aria-label="Filters">
          {listFilters.map((filter) => {
            const expected = filter.value ?? "true";
            const key = `${filter.param}=${expected}`;
            return (
              <FilterPill
                key={key}
                active={activeKey === key}
                onClick={() => applyFilter(filter)}
              >
                {filter.label}
                {typeof filter.count === "number" ? ` (${filter.count})` : ""}
              </FilterPill>
            );
          })}
        </div>
      )}

      {viewMode === "grid" && slug === "pg-rooms" ? (
        <div className="room-grid operator-room-grid">
          {(isLoading || isFetching) && rows.length === 0 ? (
            <p className="muted">Loading rooms…</p>
          ) : rows.length === 0 ? (
            <div className="record-cards-empty">
              <p>{schema.empty_state ?? "No records yet."}</p>
              {schema.empty_state_cta && (
                <Link to={schema.empty_state_cta.href} className="empty-state-cta">
                  {schema.empty_state_cta.label}
                </Link>
              )}
            </div>
          ) : (
            rows.map((row) => (
              <OperatorRoomCard
                key={String(row.id)}
                room={rowToRoomCard(row)}
                slug={slug}
              />
            ))
          )}
        </div>
      ) : (
        <DynamicTable
          schema={schema}
          rows={rows}
          loading={isLoading || isFetching}
          onRowClick={(row) => navigate(detailNavigate(String(row.id)))}
          sortColumn={ordering || defaultOrdering}
          onSortColumn={sortField ? toggleSort : undefined}
        />
      )}

      <div className="toolbar pagination">
        <button type="button" className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Showing {rangeStart}–{rangeEnd} of {total} · Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="secondary"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {showCreate && (
        <div className="modal-backdrop">
          <ResourceForm
            schema={schema}
            initial={createFormInitial(slug)}
            submitting={create.isPending}
            onCancel={() => setShowCreate(false)}
            onSubmit={async (body) => {
              await create.mutateAsync(body);
              setShowCreate(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
