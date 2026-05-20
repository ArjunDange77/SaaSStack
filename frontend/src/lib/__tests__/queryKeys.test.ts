import { describe, expect, it } from "vitest";
import { scopeTenant } from "../queryKeys";

describe("scopeTenant", () => {
  it("prefixes keys with tenant", () => {
    expect(scopeTenant("pg-demo", "resource", "pg-rooms", "list")).toEqual([
      "tenant",
      "pg-demo",
      "resource",
      "pg-rooms",
      "list",
    ]);
  });
});
