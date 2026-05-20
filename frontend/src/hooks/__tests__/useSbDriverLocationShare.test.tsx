import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSbDriverLocationShare } from "../useSbDriverLocationShare";
import { api } from "@/api/client";

vi.mock("@/api/client", () => ({
  api: { post: vi.fn().mockResolvedValue({ data: { id: 1, recorded_at: "2026-05-21T10:00:00Z" } }) },
}));

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ tenantSlug: "sai-baba-school-bus" }),
}));

const apiPost = vi.mocked(api.post);

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useSbDriverLocationShare", () => {
  let watchCallback: PositionCallback | null = null;

  beforeEach(() => {
    watchCallback = null;
    sessionStorage.clear();
    apiPost.mockClear();
    vi.stubGlobal(
      "navigator",
      {
        geolocation: {
          watchPosition: vi.fn((cb: PositionCallback) => {
            watchCallback = cb;
            return 42;
          }),
          clearWatch: vi.fn(),
        },
      }
    );
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates lastFix on watchPosition and posts to API", async () => {
    const { result } = renderHook(() => useSbDriverLocationShare(99, true), { wrapper });

    act(() => {
      result.current.setSharingEnabled(true);
    });

    await waitFor(() => expect(watchCallback).not.toBeNull());

    act(() => {
      watchCallback?.({
        coords: { latitude: 15.5, longitude: 73.8, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: 1_700_000_000_000,
      } as GeolocationPosition);
    });

    await waitFor(() => {
      expect(result.current.lastFix?.latitude).toBe(15.5);
      expect(result.current.lastFix?.longitude).toBe(73.8);
    });

    expect(apiPost).toHaveBeenCalledWith("/sb/driver/trips/99/location/", {
      latitude: "15.5",
      longitude: "73.8",
    });
  });

  it("clears lastFix when sharing is disabled", async () => {
    const { result } = renderHook(() => useSbDriverLocationShare(99, true), { wrapper });

    act(() => {
      result.current.setSharingEnabled(true);
    });
    await waitFor(() => expect(watchCallback).not.toBeNull());
    act(() => {
      watchCallback?.({
        coords: { latitude: 1, longitude: 2, accuracy: 1, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: Date.now(),
      } as GeolocationPosition);
    });
    await waitFor(() => expect(result.current.lastFix).not.toBeNull());

    act(() => {
      result.current.setSharingEnabled(false);
    });

    expect(result.current.lastFix).toBeNull();
    expect(result.current.sharing).toBe(false);
  });
});
