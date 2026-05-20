import { describe, expect, it } from "vitest";
import { canAccessPath, resolvePostLoginTarget } from "@/lib/resolvePostLoginTarget";

describe("resolvePostLoginTarget", () => {
  const tenant = "sai-baba-school-bus";

  it("sends owner to dashboard by default", () => {
    expect(resolvePostLoginTarget({ role: "owner" }, tenant)).toBe("/sb/dashboard");
  });

  it("ignores from=/sb/driver for owner without driver_id", () => {
    expect(
      resolvePostLoginTarget({ role: "owner" }, tenant, { pathname: "/sb/driver" })
    ).toBe("/sb/dashboard");
  });

  it("allows from=/sb/driver for staff with driver_id", () => {
    expect(
      resolvePostLoginTarget(
        { role: "staff", driver_id: 12 },
        tenant,
        { pathname: "/sb/driver/trip/1" }
      )
    ).toBe("/sb/driver/trip/1");
  });

  it("sends driver role to driver portal by default", () => {
    expect(resolvePostLoginTarget({ role: "driver", driver_id: 12 }, tenant)).toBe("/sb/driver");
  });

  it("rejects driver from operator notifications path", () => {
    expect(
      resolvePostLoginTarget(
        { role: "driver", driver_id: 12 },
        tenant,
        { pathname: "/sb/notifications" }
      )
    ).toBe("/sb/driver");
  });

  it("sends parent to parent portal and honors safe from", () => {
    expect(resolvePostLoginTarget({ role: "parent", parent_id: 3 }, tenant)).toBe("/sb/parent");
    expect(
      resolvePostLoginTarget(
        { role: "parent", parent_id: 3 },
        tenant,
        { pathname: "/sb/parent" }
      )
    ).toBe("/sb/parent");
  });

  it("rejects parent from operator dashboard", () => {
    expect(
      resolvePostLoginTarget(
        { role: "parent", parent_id: 3 },
        tenant,
        { pathname: "/sb/dashboard" }
      )
    ).toBe("/sb/parent");
  });
});

describe("canAccessPath", () => {
  it("requires driver role or driver_id for driver routes", () => {
    expect(canAccessPath("/sb/driver", { role: "owner" })).toBe(false);
    expect(canAccessPath("/sb/driver", { role: "driver", driver_id: 1 })).toBe(true);
    expect(canAccessPath("/sb/notifications", { role: "driver", driver_id: 1 })).toBe(false);
  });
});
