import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ResourceCatalogEntry } from "@/types/metadata";

export function HomePage() {
  const { data: catalog = [] } = useQuery({
    queryKey: ["resource-catalog"],
    queryFn: async () => {
      const { data } = await api.get<ResourceCatalogEntry[]>("/meta/catalog/");
      return data;
    },
  });

  return (
    <div>
      <h2>Platform kernel</h2>
      <p style={{ color: "var(--muted)" }}>
        Metadata-driven multi-tenant SaaS generation engine. Register a Django model, migrate, and open a resource below.
      </p>
      <ul>
        {catalog.map((r) => (
          <li key={r.slug}>
            <Link to={`/r/${r.slug}`}>{r.title}</Link>
            {r.description && <span style={{ color: "var(--muted)" }}> — {r.description}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
