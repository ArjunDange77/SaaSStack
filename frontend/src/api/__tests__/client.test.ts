import { describe, it, expect } from "vitest";
import axios from "axios";
import { apiErrorMessage } from "../client";

describe("apiErrorMessage", () => {
  it("formats DRF field validation errors", () => {
    const err = new axios.AxiosError(
      "bad",
      "400",
      undefined,
      undefined,
      {
        status: 400,
        data: { phone: ["A resident with this phone already exists."] },
        statusText: "Bad Request",
        headers: {},
        config: {} as never,
      }
    );
    expect(apiErrorMessage(err, "fallback")).toContain("phone");
  });

  it("does not surface HTML error pages for 500 responses", () => {
    const err = new axios.AxiosError(
      "server",
      "500",
      undefined,
      undefined,
      {
        status: 500,
        data: "<!doctype html><html><body>Server Error</body></html>",
        statusText: "Internal Server Error",
        headers: {},
        config: {} as never,
      }
    );
    const msg = apiErrorMessage(err, "Could not load rooms.");
    expect(msg).not.toContain("<!doctype");
    expect(msg).toMatch(/server error/i);
  });

  it("returns session message for 401", () => {
    const err = new axios.AxiosError(
      "unauth",
      "401",
      undefined,
      undefined,
      {
        status: 401,
        data: { detail: "Token invalid" },
        statusText: "Unauthorized",
        headers: {},
        config: {} as never,
      }
    );
    expect(apiErrorMessage(err, "fallback")).toMatch(/session expired/i);
  });
});
