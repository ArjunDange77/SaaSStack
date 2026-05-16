import type { ActionMeta } from "@/types/metadata";

type FilterFn = (record: Record<string, unknown>) => boolean;

const RECORD_ACTION_FILTERS: Record<string, Record<string, FilterFn>> = {
  "pg-booking-requests": {
    approve: (r) => r.status === "pending",
    reject: (r) => r.status === "pending",
  },
};

export function filterActionsForRecord(
  resource: string,
  record: Record<string, unknown> | undefined,
  actions: ActionMeta[]
): ActionMeta[] {
  if (!record) return actions;
  const rules = RECORD_ACTION_FILTERS[resource];
  if (!rules) return actions;
  return actions.filter((a) => {
    const rule = rules[a.name];
    return rule ? rule(record) : true;
  });
}
