import { Link, useParams } from "react-router-dom";
import { apiErrorMessage, isAuthError } from "@/api/client";
import { ResourceDetail } from "@/components/engine/ResourceDetail";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useResourceSchema } from "@/hooks/useResource";
import { assertSupportedSchemaVersion } from "@/types/metadata";

export function SbTripDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const { data: schema, isLoading, error } = useResourceSchema("sb-trips");
  useDocumentTitle(schema && id ? `Trip ${id} — Today's trips` : undefined);

  if (isLoading) return <p className="muted">Loading…</p>;
  if (error || !schema || !id) {
    return (
      <div>
        <p className="error">
          {apiErrorMessage(error, "Could not load trip.")}
        </p>
        {isAuthError(error) && (
          <p>
            <Link to="/login">Sign in again</Link>
          </p>
        )}
        <p>
          <Link to="/sb/trips?tab=all">← Back to Today&apos;s trips</Link>
        </p>
      </div>
    );
  }

  assertSupportedSchemaVersion(schema);
  return (
    <div className="sb-dashboard sb-trip-detail-page">
      <ResourceDetail
        slug="sb-trips"
        id={id}
        schema={schema}
        listPath="/sb/trips?tab=all"
      />
    </div>
  );
}
