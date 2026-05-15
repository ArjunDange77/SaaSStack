import { useState } from "react";
import { Link } from "react-router-dom";
import type { ResourceSchema } from "@/types/metadata";
import { useResourceDetail, useResourceMutations } from "@/hooks/useResource";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import { DynamicActionRenderer } from "./DynamicActionRenderer";
import { ResourceForm } from "./ResourceForm";

interface Props {
  slug: string;
  id: string;
  schema: ResourceSchema;
}

export function ResourceDetail({ slug, id, schema }: Props) {
  const { data: record, isLoading, refetch } = useResourceDetail(slug, id);
  const { update } = useResourceMutations(slug);
  const [editing, setEditing] = useState(false);

  if (isLoading || !record) return <p>Loading…</p>;

  const readFields = schema.fields.filter((f) => f.read_only || f.name === "id");

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
          {readFields.map((field) => (
            <div key={field.name} className="field">
              <label>{field.label}</label>
              <DynamicFieldRenderer field={field} value={record[field.name]} onChange={() => {}} />
            </div>
          ))}
          <button type="button" onClick={() => setEditing(true)}>Edit</button>
        </>
      ) : (
        <ResourceForm
          schema={schema}
          initial={record}
          submitting={update.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            await update.mutateAsync({ id, body });
            setEditing(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
