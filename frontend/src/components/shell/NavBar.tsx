import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { NavBadge } from "@/components/pg/NavBadge";
import { scopeTenant } from "@/lib/queryKeys";
import type { NavItem } from "@/types/metadata";
import { NavIcon } from "@/icons/registry";

const GROUP_LABELS: Record<string, string> = {
  core: "Core",
  operations: "Operations",
  system: "System",
};

function resolveHref(item: NavItem): string {
  if (item.resource_slug) {
    return `/r/${item.resource_slug}`;
  }
  const href = item.href || "/";
  if (href.startsWith("/api")) {
    return "/";
  }
  return href;
}

interface Props {
  badges?: Record<string, number>;
}

export function NavBar({ badges = {} }: Props) {
  const { tenantSlug } = useAuth();
  const { data: items = [] } = useQuery({
    queryKey: scopeTenant(tenantSlug, "nav-items"),
    queryFn: async () => {
      const { data } = await api.get<NavItem[]>("/cosmetix/nav-items/");
      return data;
    },
  });

  let lastGroup = "";

  return (
    <nav className="sidebar-nav">
      {items.map((item) => {
        const group = item.nav_group || "";
        const showHeading = group && group !== lastGroup;
        if (showHeading) lastGroup = group;
        const to = resolveHref(item);
        const badgeCount = badges[to] ?? 0;
        const label = (
          <>
            <NavIcon name={item.icon} />
            {item.label}
            <NavBadge count={badgeCount} />
          </>
        );
        return (
          <div key={item.id} className="nav-item-wrap">
            {showHeading && (
              <p className="nav-group-label">{GROUP_LABELS[group] ?? group}</p>
            )}
            {item.open_in_new_tab || item.href.startsWith("http") ? (
              <a href={item.href} target="_blank" rel="noreferrer" className="nav-link">
                {label}
              </a>
            ) : (
              <NavLink to={to} end={to === "/"} className="nav-link">
                {label}
              </NavLink>
            )}
          </div>
        );
      })}
    </nav>
  );
}
