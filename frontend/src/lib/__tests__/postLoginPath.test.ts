import { describe, expect, it } from "vitest";
import { postLoginPath } from "@/lib/postLoginPath";

describe("postLoginPath", () => {
  it("sends school bus owner to sb dashboard", () => {
    expect(postLoginPath("owner", "sai-baba-school-bus", null, null)).toBe("/sb/dashboard");
  });

  it("sends school bus driver to driver portal", () => {
    expect(postLoginPath("staff", "sai-baba-school-bus", 12, null)).toBe("/sb/driver");
  });

  it("never sends owner to driver portal even with driver_id", () => {
    expect(postLoginPath("owner", "sai-baba-school-bus", 12, null)).toBe("/sb/dashboard");
  });

  it("sends parent to parent portal", () => {
    expect(postLoginPath("parent", "sai-baba-school-bus", null, 3)).toBe("/sb/parent");
  });

  it("sends pg owner to pg dashboard", () => {
    expect(postLoginPath("owner", "my-pg-hostel", null, null)).toBe("/dashboard");
  });
});
