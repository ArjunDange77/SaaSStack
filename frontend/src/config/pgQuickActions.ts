import type { TablerIcon } from "@tabler/icons-react";
import {
  IconCalendarPlus,
  IconDoor,
  IconReceipt2,
  IconUserPlus,
} from "@tabler/icons-react";

export interface QuickAction {
  label: string;
  to: string;
  icon: TablerIcon;
  action?: "create";
  external?: boolean;
}

export function pgQuickActions(tenantSlug: string): QuickAction[] {
  return [
    { label: "Add resident", to: "/r/pg-residents?new=1", icon: IconUserPlus, action: "create" },
    { label: "New booking", to: `/book/${tenantSlug}`, icon: IconCalendarPlus, external: true },
    { label: "Record rent", to: "/r/pg-rent-records?new=1", icon: IconReceipt2, action: "create" },
    { label: "Manage rooms", to: "/r/pg-rooms", icon: IconDoor },
  ];
}
