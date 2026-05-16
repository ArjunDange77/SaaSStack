import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ListFilterMeta, ResourceSchema } from "@/types/metadata";
import { useAuth } from "@/auth/AuthContext";
import { RoomCard, type RoomCardData } from "@/components/pg/RoomCard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useResourceList, useResourceMutations } from "@/hooks/useResource";
import { DynamicTable } from "./DynamicTable";
import { ResourceForm } from "./ResourceForm";

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

export function ResourceList({ slug, schema }: Props) {
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
    return saved === "grid" ? "grid" : "table";
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
  const sortField = schema.ordering?.default?.[0]?.replace(/^-/, "") ?? "";
  const activeKey = activeFilterKey(filterParams, listFilters);

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

  return (
    <div>
      <h2 className="resource-list-title">{schema.title}</h2>
      {schema.description && <p className="muted">{schema.description}</p>}
      <div className="toolbar toolbar-responsive">
        <input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search"
        />
        {sortField && (
          <select
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
            aria-label="Sort"
          >
            <option value="">Default sort</option>
            <option value={sortField}>{sortField} ↑</option>
            <option value={`-${sortField}`}>{sortField} ↓</option>
          </select>
        )}
        {schema.capabilities?.create !== false && (
          <button type="button" onClick={() => setShowCreate(true)}>New</button>
        )}
        {listViews.includes("grid") && (
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`secondary${viewMode === "table" ? " active" : ""}`}
              onClick={() => {
                setViewMode("table");
                localStorage.setItem(storageKey, "table");
              }}
            >
              Table
            </button>
            <button
              type="button"
              className={`secondary${viewMode === "grid" ? " active" : ""}`}
              onClick={() => {
                setViewMode("grid");
                localStorage.setItem(storageKey, "grid");
              }}
            >
              Grid
            </button>
          </div>
        )}
      </div>

      {listFilters.length > 0 && (
        <div className="filter-chips" role="group" aria-label="Filters">
          {listFilters.map((filter) => {
            const expected = filter.value ?? "true";
            const key = `${filter.param}=${expected}`;
            return (
              <button
                key={key}
                type="button"
                className={`filter-chip${activeKey === key ? " active" : ""}`}
                onClick={() => applyFilter(filter)}
              >
                {filter.label}
                {typeof filter.count === "number" ? ` (${filter.count})` : ""}
              </button>
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
              <RoomCard
                key={String(row.id)}
                room={rowToRoomCard(row)}
                onClick={() => navigate(`/r/${slug}/${row.id}`)}
              />
            ))
          )}
        </div>
      ) : (
        <DynamicTable
          schema={schema}
          rows={rows}
          loading={isLoading || isFetching}
          onRowClick={(row) => navigate(`/r/${slug}/${row.id}`)}
        />
      )}

      <div className="toolbar pagination">
        <button type="button" className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages} ({total} records)
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
