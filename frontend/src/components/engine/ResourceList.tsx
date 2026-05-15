import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ResourceSchema } from "@/types/metadata";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useResourceList, useResourceMutations } from "@/hooks/useResource";
import { DynamicTable } from "./DynamicTable";
import { ResourceForm } from "./ResourceForm";

interface Props {
  slug: string;
  schema: ResourceSchema;
}

export function ResourceList({ slug, schema }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const pageSize = schema.pagination?.page_size ?? 25;
  const { data, isLoading } = useResourceList(slug, debouncedSearch, page, ordering || undefined);
  const { create } = useResourceMutations(slug);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, ordering]);

  const rows = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (isLoading) return <p>Loading…</p>;

  const sortField = schema.ordering?.default?.[0]?.replace(/^-/, "") ?? "";

  return (
    <div>
      <h2>{schema.title}</h2>
      <div className="toolbar">
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
        <button type="button" onClick={() => setShowCreate(true)}>New</button>
      </div>

      <DynamicTable
        schema={schema}
        rows={rows}
        onRowClick={(row) => navigate(`/r/${slug}/${row.id}`)}
      />

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
