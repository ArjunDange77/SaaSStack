import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMediaQuery, useIsMobile } from "../useMediaQuery";

describe("useMediaQuery", () => {
  let listeners: Array<() => void>;
  let matches: boolean;

  beforeEach(() => {
    listeners = [];
    matches = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        get matches() {
          return matches;
        },
        media: query,
        addEventListener: (_: string, cb: () => void) => {
          listeners.push(cb);
        },
        removeEventListener: (_: string, cb: () => void) => {
          listeners = listeners.filter((l) => l !== cb);
        },
      }))
    );
  });

  it("returns match state and updates on change", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    matches = true;
    act(() => {
      listeners.forEach((l) => l());
    });
    expect(result.current).toBe(true);
  });

  it("useIsMobile inverts md breakpoint", () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    matches = true;
    act(() => {
      listeners.forEach((l) => l());
    });
    expect(result.current).toBe(false);
  });
});
