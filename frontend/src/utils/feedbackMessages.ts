import type { ActionMeta, ResourceSchema } from "@/types/metadata";

const ACTION_SUCCESS: Record<string, string> = {
  vacate: "Assignment vacated",
  transfer: "Resident transferred",
  verify: "Document verified",
  reject: "Document rejected",
  mark_paid: "Rent marked paid",
  in_progress: "Complaint marked in progress",
  resolve: "Complaint resolved",
};

export function createSuccessMessage(schema: ResourceSchema): string {
  const singular = schema.title.replace(/s$/, "");
  return `${singular} created`;
}

export function updateSuccessMessage(schema: ResourceSchema): string {
  const singular = schema.title.replace(/s$/, "");
  return `${singular} saved`;
}

export function deleteSuccessMessage(schema: ResourceSchema): string {
  const singular = schema.title.replace(/s$/, "");
  return `${singular} deleted`;
}

export function actionSuccessMessage(action: ActionMeta): string {
  return ACTION_SUCCESS[action.name] ?? `${action.label ?? action.name.replace(/_/g, " ")} completed`;
}
