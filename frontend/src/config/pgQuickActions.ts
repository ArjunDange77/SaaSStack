export interface QuickAction {
  label: string;
  to: string;
  action?: "create";
  external?: boolean;
}

export function pgQuickActions(tenantSlug: string): QuickAction[] {
  return [
    { label: "Add resident", to: "/r/pg-residents?new=1", action: "create" },
    { label: "Record rent", to: "/r/pg-rent-records?new=1", action: "create" },
    { label: "New booking", to: `/book/${tenantSlug}`, external: true },
  ];
}
