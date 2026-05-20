import { describe, expect, it } from "vitest";
import { filterActionsForRecord } from "../actionVisibility";
import type { ActionMeta } from "@/types/metadata";

const actions: ActionMeta[] = [
  { name: "approve", label: "Approve", url_path: "approve", detail: true, methods: ["post"] },
  { name: "reject", label: "Reject", url_path: "reject", detail: true, methods: ["post"] },
];

describe("filterActionsForRecord", () => {
  it("keeps approve/reject when pending", () => {
    const out = filterActionsForRecord("pg-booking-requests", { status: "pending" }, actions);
    expect(out.map((a) => a.name)).toEqual(["approve", "reject"]);
  });

  it("hides approve/reject when approved", () => {
    const out = filterActionsForRecord("pg-booking-requests", { status: "approved" }, actions);
    expect(out).toHaveLength(0);
  });
});
