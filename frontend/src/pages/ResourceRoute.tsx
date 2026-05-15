import { useParams } from "react-router-dom";
import { useResourceSchema } from "@/hooks/useResource";
import { ResourceList } from "@/components/engine/ResourceList";
import { ResourceDetail } from "@/components/engine/ResourceDetail";

export function ResourceListRoute() {
  const { slug } = useParams<{ slug: string }>();
  const { data: schema, isLoading, error } = useResourceSchema(slug);

  if (isLoading) return <p>Loading schema…</p>;
  if (error || !schema || !slug) return <p className="error">Unknown resource: {slug}</p>;

  return <ResourceList slug={slug} schema={schema} />;
}

export function ResourceDetailRoute() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { data: schema, isLoading, error } = useResourceSchema(slug);

  if (isLoading) return <p>Loading schema…</p>;
  if (error || !schema || !slug || !id) return <p className="error">Resource not found</p>;

  return <ResourceDetail slug={slug} id={id} schema={schema} />;
}
