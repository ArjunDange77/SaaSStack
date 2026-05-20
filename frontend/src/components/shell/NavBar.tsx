import { useState } from "react";
import { NavLink } from "react-router-dom";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { NavBadge } from "@/components/pg/NavBadge";
import { scopeTenant } from "@/lib/queryKeys";
import type { NavItem } from "@/types/metadata";
import { NavIcon } from "@/icons/registry";

const GROUP_LABELS: Record<string, string> = {
  today: "TODAY",
  manage: "MANAGE",
  core: "Overview",
  operations: "MANAGE",
  system: "Other",
};

const COLLAPSED_DEFAULT = new Set(["manage", "operations"]);

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
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(COLLAPSED_DEFAULT));
  const { data: items = [] } = useQuery({
    queryKey: scopeTenant(tenantSlug, "nav-items"),
    queryFn: async () => {
      const { data } = await api.get<NavItem[]>("/cosmetix/nav-items/");
      return data;
    },
  });

  let lastGroup = "";

  const toggleGroup = (group: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <nav className="sidebar-nav">
      {items.map((item) => {
        const group = item.nav_group || "";
        const showHeading = group && group !== lastGroup;
        if (showHeading) lastGroup = group;
        const to = resolveHref(item);
        const badgeCount = badges[to] ?? 0;
        const isCollapsed = collapsed.has(group);
        const groupLabel = GROUP_LABELS[group] ?? group;
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
              <button
                type="button"
                className="nav-section-label collapsible"
                onClick={() => toggleGroup(group)}
                aria-expanded={!isCollapsed}
              >
                {groupLabel}
                {isCollapsed ? (
                  <IconChevronRight size={12} aria-hidden />
                ) : (
                  <IconChevronDown size={12} aria-hidden />
                )}
              </button>
            )}
            {(!group || !isCollapsed) &&
              (item.open_in_new_tab || item.href.startsWith("http") ? (
                <a href={item.href} target="_blank" rel="noreferrer" className="nav-link">
                  {label}
                </a>
              ) : (
                <NavLink to={to} end={to === "/"} className="nav-link">
                  {label}
                </NavLink>
              ))}
          </div>
        );
      })}
    </nav>
  );
}
