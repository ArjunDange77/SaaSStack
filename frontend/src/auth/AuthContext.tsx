import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { fetchMe, login as apiLogin } from "@/api/client";

interface AuthState {
  accessToken: string | null;
  user: Record<string, unknown> | null;
  tenantSlug: string;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (username: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => void;
  setTenantSlug: (slug: string) => void;
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
        setUser(me);
        localStorage.setItem("user", JSON.stringify(me));
      } catch {
        setUser({ username });
      }
    },
    [setTenantSlug]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      user,
      tenantSlug,
      isAuthenticated: Boolean(accessToken),
      login,
      logout,
      setTenantSlug,
    }),
    [accessToken, user, tenantSlug, login, logout, setTenantSlug]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
