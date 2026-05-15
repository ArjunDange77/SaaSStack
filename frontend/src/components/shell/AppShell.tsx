import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useMyTenants } from "@/hooks/useResource";
import { MobileHeader } from "./MobileHeader";
import { NavBar } from "./NavBar";

export function AppShell() {
  const { user, logout, tenantSlug, setTenantSlug } = useAuth();
  const { data: myTenants } = useMyTenants(true);
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);

  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", menuOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeMenu]);

  const { data: branding } = useQuery({
    queryKey: ["branding", tenantSlug],
    queryFn: async () => {
      try {
        const { data } = await api.get("/cosmetix/branding/resolve/");
        return data as { name?: string; css_vars?: Record<string, string> };
      } catch {
        return null;
      }
    },
  });

  const cssVars = branding?.css_vars;
  if (cssVars) {
    for (const [k, v] of Object.entries(cssVars)) {
      document.documentElement.style.setProperty(k, v);
    }
  }

  const headerTitle = branding?.name ?? "SaaSStack";
  const tenantLabel =
    myTenants?.find((t) => t.slug === tenantSlug)?.name ?? tenantSlug;

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}`}>
      <aside id="app-sidebar" className="sidebar" aria-hidden={isMobile ? !menuOpen : false}>
        <h1 className="sidebar-brand">SaaSStack</h1>
        {branding?.name && <p className="sidebar-tagline">{branding.name}</p>}
        <NavBar />
        <hr className="sidebar-divider" />
        <label className="sidebar-label">Tenant</label>
        {myTenants && myTenants.length > 0 ? (
          <select
            className="sidebar-tenant-select"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
          >
            {myTenants.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="sidebar-tenant-select"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
          />
        )}
        <p className="sidebar-user">
          {user && "username" in user ? String(user.username) : "Signed in"}
        </p>
        <button type="button" className="secondary sidebar-logout" onClick={logout}>
          Logout
        </button>
      </aside>
      <button
        type="button"
        className="sidebar-backdrop mobile-only"
        aria-label="Close menu"
        onClick={closeMenu}
        tabIndex={menuOpen ? 0 : -1}
      />
      <div className="app-content">
        <MobileHeader
          title={headerTitle}
          subtitle={tenantLabel}
          menuOpen={menuOpen}
          onMenuToggle={toggleMenu}
        />
        <main className="main content-max">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
