import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ResourceSchema } from "@/types/metadata";
import { useResourceDetail, useResourceMutations, useResourceTimeline } from "@/hooks/useResource";
import { useRelationLabelMaps } from "@/hooks/useRelationLabels";
import { DynamicActionRenderer } from "./DynamicActionRenderer";
import { CellValue } from "./CellValue";
import { ResourceForm } from "./ResourceForm";

interface Props {
  slug: string;
  id: string;
  schema: ResourceSchema;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleString();
}

export function ResourceDetail({ slug, id, schema }: Props) {
  const navigate = useNavigate();
  const { data: record, isLoading, refetch } = useResourceDetail(slug, id);
  const { data: timeline = [] } = useResourceTimeline(slug, id);
  const { update, remove } = useResourceMutations(slug);
  const labelMaps = useRelationLabelMaps(schema);
  const [editing, setEditing] = useState(false);

  if (isLoading || !record) return <p>Loading…</p>;

  const displayFields = schema.fields.filter(
    (f) => f.name !== "tenant" && (f.read_only || f.name === "id" || !editing)
  );

  const handleDelete = async () => {
    if (!window.confirm(`Delete this ${schema.title.slice(0, -1).toLowerCase()}?`)) return;
    await remove.mutateAsync(id);
    navigate(`/r/${slug}`);
  };

  return (
    <div>
      <p>
        <Link to={`/r/${slug}`}>← Back to {schema.title}</Link>
      </p>
      <h2>
        {schema.title} #{id}
      </h2>

      <DynamicActionRenderer schema={schema} recordId={id} onDone={() => refetch()} />

      {!editing ? (
        <>
          {displayFields.map((field) => (
            <div key={field.name} className="field">
              <label>{field.label}</label>
              <CellValue field={field} value={record[field.name]} labelMaps={labelMaps} />
              {(field.ui?.help_text || field.help_text) && (
                <p className="field-help">{field.ui?.help_text || field.help_text}</p>
              )}
            </div>
          ))}
          <div className="toolbar">
            <button type="button" onClick={() => setEditing(true)}>Edit</button>
            <button type="button" className="secondary danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </>
      ) : (
        <ResourceForm
          schema={schema}
          initial={record}
          submitting={update.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            await update.mutateAsync({ id, body, initial: record });
            setEditing(false);
            refetch();
          }}
        />
      )}

      {timeline.length > 0 && (
        <section className="timeline">
          <h3>Activity</h3>
          <ul>
            {timeline.map((entry) => (
              <li key={String(entry.id)}>
                <strong>{String(entry.verb)}</strong> — {String(entry.message)}
                {entry.actor_username ? (
                  <span className="muted"> · {String(entry.actor_username)}</span>
                ) : null}
                <span className="muted"> · {formatRelativeTime(String(entry.created_at))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
