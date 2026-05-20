import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiErrorMessage } from "@/api/client";
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
  /** List/back navigation target (default `/r/:slug`). */
  listPath?: string;
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

export function ResourceDetail({ slug, id, schema, listPath }: Props) {
  const navigate = useNavigate();
  const backPath = listPath ?? `/r/${slug}`;
  const { data: record, isLoading, refetch } = useResourceDetail(slug, id);
  const {
    data: timeline = [],
    isLoading: timelineLoading,
    isError: timelineError,
    error: timelineErr,
    refetch: refetchTimeline,
  } = useResourceTimeline(slug, id);
  const { update, remove } = useResourceMutations(slug, schema);
  const labelMaps = useRelationLabelMaps(schema);
  const [editing, setEditing] = useState(false);
  const [activityOpen, setActivityOpen] = useState(true);

  if (isLoading || !record) return <p>Loading…</p>;

  const displayFields = schema.fields.filter(
    (f) => f.name !== "tenant" && (f.read_only || f.name === "id" || !editing)
  );

  const handleDelete = async () => {
    if (!window.confirm(`Delete this ${schema.title.slice(0, -1).toLowerCase()}?`)) return;
    await remove.mutateAsync(id);
    navigate(backPath);
  };

  return (
    <div className="resource-detail">
      <header className="resource-detail-header">
        <p className="resource-detail-back">
          <Link to={backPath}>← Back to {schema.title}</Link>
        </p>
        <div className="resource-detail-title-row">
          <h2 className="resource-list-title page-title">
            {schema.title} #{id}
          </h2>
          {!editing && (
            <DynamicActionRenderer
              schema={schema}
              recordId={id}
              record={record}
              onDone={() => {
                refetch();
                refetchTimeline();
              }}
              className="resource-detail-actions"
            />
          )}
        </div>
      </header>

      {!editing ? (
        <>
          <div className="resource-detail-body">
            {displayFields.map((field) => (
              <div key={field.name} className="field field-block">
                <label>{field.label}</label>
                <CellValue field={field} value={record[field.name]} labelMaps={labelMaps} />
                {(field.ui?.help_text || field.help_text) && (
                  <p className="field-help">{field.ui?.help_text || field.help_text}</p>
                )}
              </div>
            ))}
          </div>
          <div className="resource-detail-footer toolbar toolbar-actions-responsive">
            {schema.capabilities?.update !== false && (
              <button type="button" onClick={() => setEditing(true)}>Edit</button>
            )}
            {schema.capabilities?.delete !== false && (
              <button type="button" className="secondary danger" onClick={handleDelete}>
                Delete
              </button>
            )}
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
            refetchTimeline();
          }}
        />
      )}

      <section className="timeline resource-detail-timeline" aria-labelledby="activity-heading">
        <button
          type="button"
          className="timeline-toggle secondary"
          id="activity-heading"
          aria-expanded={activityOpen}
          onClick={() => setActivityOpen((o) => !o)}
        >
          Activity {activityOpen ? "▾" : "▸"}
        </button>
        {activityOpen && (
          <div className="timeline-body">
            {timelineLoading && <p className="muted">Loading activity…</p>}
            {timelineError && (
              <p className="error">
                {apiErrorMessage(timelineErr, "Could not load activity.")}
              </p>
            )}
            {!timelineLoading && !timelineError && timeline.length === 0 && (
              <p className="muted">No activity recorded yet.</p>
            )}
            {timeline.length > 0 && (
              <ul>
                {timeline.map((entry) => {
                  const createdAt = String(entry.created_at);
                  const absolute = new Date(createdAt).toLocaleString();
                  return (
                    <li key={String(entry.id)} title={absolute}>
                      <strong>{String(entry.message || entry.verb)}</strong>
                      {entry.actor_username ? (
                        <span className="muted"> · {String(entry.actor_username)}</span>
                      ) : null}
                      <span className="muted"> · {formatRelativeTime(createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
