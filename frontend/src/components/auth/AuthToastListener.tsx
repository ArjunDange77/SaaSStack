import { useEffect } from "react";
import { AUTH_EXPIRED_EVENT } from "@/api/client";
import { useToast } from "@/components/ui/ToastProvider";

export function AuthToastListener() {
  const { error } = useToast();

  useEffect(() => {
    const onExpired = () => {
      error("Your session expired. Please sign in again.");
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [error]);

  return null;
}
