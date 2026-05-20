import {
  IconAlertTriangle,
  IconBed,
  IconBell,
  IconBuilding,
  IconBus,
  IconCalendar,
  IconClipboardList,
  IconCurrencyRupee,
  IconFileText,
  IconLayoutDashboard,
  IconList,
  IconRoute,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react";
import type { TablerIcon } from "@tabler/icons-react";

const ICON_MAP: Record<string, TablerIcon> = {
  home: IconLayoutDashboard,
  dashboard: IconLayoutDashboard,
  "layout-dashboard": IconLayoutDashboard,
  list: IconList,
  users: IconUsers,
  user: IconUsers,
  building: IconBuilding,
  bed: IconBed,
  file: IconFileText,
  currency: IconCurrencyRupee,
  alert: IconAlertTriangle,
  calendar: IconCalendar,
  box: IconBuilding,
  bus: IconBus,
  "clipboard-list": IconClipboardList,
  wallet: IconWallet,
  bell: IconBell,
  route: IconRoute,
};

export function NavIcon({ name }: { name?: string }) {
  const key = (name || "list").toLowerCase();
  const Icon = ICON_MAP[key] ?? IconList;
  return (
    <span className="nav-icon-wrap">
      <Icon size={16} stroke={1.75} aria-hidden />
    </span>
  );
}
