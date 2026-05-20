import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/client";

const POST_INTERVAL_MS = 20_000;
const STORAGE_PREFIX = "sb-gps-share:";

function storageKey(tripId: number) {
  return `${STORAGE_PREFIX}${tripId}`;
}

export function useSbDriverLocationShare(tripId: number, tripActive: boolean) {
  const [sharing, setSharing] = useState(() => {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(storageKey(tripId)) === "1";
  });
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPostRef = useRef(0);

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
      } catch {
        setError("Could not send location to server.");
      }
    },
    [tripId]
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
      }
    },
    [tripId, stopWatch]
  );

  useEffect(() => {
    if (!sharing || !tripActive || !navigator.geolocation) {
      stopWatch();
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        void postLocation(pos.coords.latitude, pos.coords.longitude);
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

  return { sharing, setSharingEnabled, error };
}
