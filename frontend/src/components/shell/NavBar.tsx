import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { NavBadge } from "@/components/pg/NavBadge";
import type { NavItem } from "@/types/metadata";
import { NavIcon } from "@/icons/registry";

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
  const { data: items = [] } = useQuery({
    queryKey: ["nav-items"],
    queryFn: async () => {
      const { data } = await api.get<NavItem[]>("/cosmetix/nav-items/");
      return data;
    },
  });

  return (
    <nav>
      {items.map((item) => {
        const to = resolveHref(item);
        const badgeCount = badges[to] ?? 0;
        const label = (
          <>
            <NavIcon name={item.icon} />
            {item.label}
            <NavBadge count={badgeCount} />
          </>
        );
        if (item.open_in_new_tab || item.href.startsWith("http")) {
          return (
            <a key={item.id} href={item.href} target="_blank" rel="noreferrer">
              {label}
            </a>
          );
        }
        return (
          <NavLink key={item.id} to={to} end={to === "/"}>
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}
