import { describe, it, expect } from "vitest";
import axios from "axios";
import { apiErrorMessage, isAuthError } from "@/api/client";

describe("api client helpers", () => {
  it("detects 401 as auth error", () => {
    const err = new axios.AxiosError("Unauthorized", "401", undefined, undefined, {
      status: 401,
      data: {},
      statusText: "Unauthorized",
      headers: {},
      config: {} as never,
    });
    expect(isAuthError(err)).toBe(true);
    expect(apiErrorMessage(err, "fallback")).toContain("session expired");
  });
});
