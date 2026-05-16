import {
  IconAlertTriangle,
  IconBed,
  IconBuilding,
  IconCalendar,
  IconCurrencyRupee,
  IconFileText,
  IconLayoutDashboard,
  IconList,
  IconUsers,
} from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";

const ICON_MAP: Record<string, TablerIcon> = {
  home: IconLayoutDashboard,
  dashboard: IconLayoutDashboard,
  list: IconList,
  users: IconUsers,
  building: IconBuilding,
  bed: IconBed,
  file: IconFileText,
  currency: IconCurrencyRupee,
  alert: IconAlertTriangle,
  calendar: IconCalendar,
  box: IconBuilding,
};

export function NavIcon({ name }: { name?: string }) {
  const key = (name || "list").toLowerCase();
  const Icon = ICON_MAP[key] ?? IconList;
  return <Icon size={16} stroke={1.75} aria-hidden />;
}
