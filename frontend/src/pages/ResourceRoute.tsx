import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { useResourceSchema } from "@/hooks/useResource";
import { assertSupportedSchemaVersion } from "@/types/metadata";
import { ResourceList } from "@/components/engine/ResourceList";
import { ResourceDetail } from "@/components/engine/ResourceDetail";

function SchemaError({ slug, error }: { slug?: string; error: unknown }) {
  if (isAuthError(error)) {
    return (
      <div>
        <p className="error">{apiErrorMessage(error, "Session expired.")}</p>
        <p>
          <Link to="/login">Sign in again</Link>
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="error">
        {apiErrorMessage(error, `Could not load resource "${slug}".`)}
      </p>
      <p className="muted">
        If the API was restarted, refresh the page. Otherwise check that{" "}
        <code>{slug}</code> is registered on the backend.
      </p>
    </div>
  );
}

export function ResourceListRoute() {
  const { slug } = useParams<{ slug: string }>();
  const { data: schema, isLoading, error } = useResourceSchema(slug);

  if (isLoading) return <p>Loading schema…</p>;
  if (error || !schema || !slug) {
    return <SchemaError slug={slug} error={error} />;
  }

  assertSupportedSchemaVersion(schema);
  return <ResourceList slug={slug} schema={schema} />;
}

export function ResourceDetailRoute() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { data: schema, isLoading, error } = useResourceSchema(slug);

  if (isLoading) return <p>Loading schema…</p>;
  if (error || !schema || !slug || !id) {
    return <SchemaError slug={slug} error={error} />;
  }

  assertSupportedSchemaVersion(schema);
  return <ResourceDetail slug={slug} id={id} schema={schema} />;
}
