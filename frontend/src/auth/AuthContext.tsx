import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_EXPIRED_EVENT, clearAuthStorage, fetchMe, login as apiLogin } from "@/api/client";

export type AppRole = "owner" | "staff" | "resident" | null;

interface AuthState {
  accessToken: string | null;
  user: Record<string, unknown> | null;
  tenantSlug: string;
  role: AppRole;
  residentId: number | null;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (username: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => void;
  setTenantSlug: (slug: string) => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem("access")
  );
  const [user, setUser] = useState<Record<string, unknown> | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [tenantSlug, setTenantSlugState] = useState(
    () => localStorage.getItem("tenant_slug") || "demo"
  );
  const [role, setRole] = useState<AppRole>(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      const u = JSON.parse(raw) as { role?: AppRole };
      return u.role ?? null;
    } catch {
      return null;
    }
  });
  const [residentId, setResidentId] = useState<number | null>(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      const u = JSON.parse(raw) as { resident_id?: number };
      return u.resident_id ?? null;
    } catch {
      return null;
    }
  });

  const applyMe = useCallback((me: Record<string, unknown>) => {
    setUser(me);
    setRole((me.role as AppRole) ?? null);
    setResidentId(typeof me.resident_id === "number" ? me.resident_id : null);
    localStorage.setItem("user", JSON.stringify(me));
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await fetchMe();
    applyMe(me);
  }, [applyMe]);

  useEffect(() => {
    const onExpired = () => {
      setAccessToken(null);
      setUser(null);
      setRole(null);
      setResidentId(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const setTenantSlug = useCallback((slug: string) => {
    localStorage.setItem("tenant_slug", slug);
    setTenantSlugState(slug);
  }, []);

  const login = useCallback(
    async (username: string, password: string, tenant = "demo") => {
      await apiLogin(username, password);
      setAccessToken(localStorage.getItem("access"));
      setTenantSlug(tenant);
      try {
        const me = await fetchMe();
        applyMe(me);
      } catch {
        setUser({ username });
      }
    },
    [setTenantSlug, applyMe]
  );

  const logout = useCallback(() => {
    clearAuthStorage();
    setAccessToken(null);
    setUser(null);
    setRole(null);
    setResidentId(null);
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      tenantSlug,
      role,
      residentId,
      isAuthenticated: Boolean(accessToken),
      login,
      logout,
      setTenantSlug,
      refreshMe,
    }),
    [accessToken, user, tenantSlug, role, residentId, login, logout, setTenantSlug, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
