import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ResourceSchema } from "@/types/metadata";
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
  const [showCreate, setShowCreate] = useState(false);
  const { data: rows = [], isLoading, refetch } = useResourceList(slug, search);
  const { create } = useResourceMutations(slug);

  if (isLoading) return <p>Loading…</p>;

  return (
    <div>
      <h2>{schema.title}</h2>
      <div className="toolbar">
        <input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && refetch()}
        />
        <button type="button" onClick={() => refetch()}>Search</button>
        <button type="button" onClick={() => setShowCreate(true)}>New</button>
      </div>

      <DynamicTable
        schema={schema}
        rows={rows}
        onRowClick={(row) => navigate(`/r/${slug}/${row.id}`)}
      />

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
