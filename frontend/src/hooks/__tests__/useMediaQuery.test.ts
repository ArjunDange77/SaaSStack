import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useIsMobile, useMediaQuery } from "../useMediaQuery";

function createMatchMedia(matches: boolean) {
  const listeners: Array<() => void> = [];
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    _emit: () => listeners.forEach((fn) => fn()),
  }));
}

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("useIsMobile is true when below md breakpoint", () => {
    vi.stubGlobal("matchMedia", createMatchMedia(false));
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("useMediaQuery matches min-width query", () => {
    vi.stubGlobal("matchMedia", createMatchMedia(true));
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });
});
