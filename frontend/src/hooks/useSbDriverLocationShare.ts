import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { scopeTenant } from "@/lib/queryKeys";

const POST_INTERVAL_MS = 20_000;
const STORAGE_PREFIX = "sb-gps-share:";

export interface SbDriverLocationFix {
  latitude: number;
  longitude: number;
  recordedAt: string;
}

function storageKey(tripId: number) {
  return `${STORAGE_PREFIX}${tripId}`;
}

export function useSbDriverLocationShare(tripId: number, tripActive: boolean) {
  const { tenantSlug } = useAuth();
  const queryClient = useQueryClient();
  const [sharing, setSharing] = useState(() => {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(storageKey(tripId)) === "1";
  });
  const [error, setError] = useState<string | null>(null);
  const [lastFix, setLastFix] = useState<SbDriverLocationFix | null>(null);
  const [backgroundHidden, setBackgroundHidden] = useState(
    () => typeof document !== "undefined" && document.hidden
  );
  const watchIdRef = useRef<number | null>(null);
  const lastPostRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (lock) {
      void lock.release().catch(() => undefined);
    }
  }, []);

  const postLocation = useCallback(
    async (latitude: number, longitude: number) => {
      const now = Date.now();
      if (now - lastPostRef.current < POST_INTERVAL_MS - 1000) return;
      lastPostRef.current = now;
      try {
        await api.post(`/sb/driver/trips/${tripId}/location/`, {
          latitude: String(latitude),
          longitude: String(longitude),
        });
        setError(null);
        if (tenantSlug) {
          void queryClient.invalidateQueries({
            queryKey: scopeTenant(tenantSlug, ["sb-driver-today"]),
          });
        }
      } catch {
        setError("Could not send location to server.");
      }
    },
    [tripId, tenantSlug, queryClient]
  );

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const setSharingEnabled = useCallback(
    (enabled: boolean) => {
      setSharing(enabled);
      sessionStorage.setItem(storageKey(tripId), enabled ? "1" : "0");
      if (!enabled) {
        stopWatch();
        setError(null);
        setLastFix(null);
        releaseWakeLock();
      }
    },
    [tripId, stopWatch, releaseWakeLock]
  );

  useEffect(() => {
    const onVisibility = () => setBackgroundHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!sharing || !tripActive) {
      releaseWakeLock();
      return;
    }
    if (!("wakeLock" in navigator)) return;

    let cancelled = false;
    void navigator.wakeLock.request("screen").then((sentinel) => {
      if (cancelled) {
        void sentinel.release().catch(() => undefined);
        return;
      }
      wakeLockRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
        }
      });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      releaseWakeLock();
    };
  }, [sharing, tripActive, releaseWakeLock]);

  useEffect(() => {
    if (!sharing || !tripActive || !navigator.geolocation) {
      stopWatch();
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const fix: SbDriverLocationFix = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          recordedAt: new Date(pos.timestamp).toISOString(),
        };
        setLastFix(fix);
        void postLocation(fix.latitude, fix.longitude);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission denied.");
          setSharingEnabled(false);
        } else {
          setError("Could not read GPS fix.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 }
    );

    return stopWatch;
  }, [sharing, tripActive, postLocation, setSharingEnabled, stopWatch]);

  useEffect(() => {
    if (!tripActive) {
      setSharingEnabled(false);
    }
  }, [tripActive, setSharingEnabled]);

  return { sharing, setSharingEnabled, error, lastFix, backgroundHidden };
}
