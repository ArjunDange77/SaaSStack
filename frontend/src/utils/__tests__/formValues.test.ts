import { describe, it, expect } from "vitest";
import { coerceRelationPk, hasFileValues, toFormData } from "../formValues";

describe("formValues", () => {
  it("coerces numeric pk", () => {
    expect(coerceRelationPk("42")).toBe(42);
  });

  it("keeps non-numeric pk as string", () => {
    expect(coerceRelationPk("abc-uuid")).toBe("abc-uuid");
  });

  it("detects file in body", () => {
    const file = new File(["x"], "a.txt");
    expect(hasFileValues({ name: file })).toBe(true);
    expect(hasFileValues({ name: "text" })).toBe(false);
  });

  it("builds FormData skipping empty", () => {
    const fd = toFormData({ a: "1", b: "", c: null });
    expect(fd.get("a")).toBe("1");
    expect(fd.get("b")).toBeNull();
  });
});
