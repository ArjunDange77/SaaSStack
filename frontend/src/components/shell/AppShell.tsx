import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { scopeTenant } from "@/lib/queryKeys";
import { useMyTenants, usePgDashboard } from "@/hooks/useResource";
import { MobileHeader } from "./MobileHeader";
import { NavBar } from "./NavBar";
import { NotificationBell } from "./NotificationBell";

export function AppShell() {
  const { user, logout, tenantSlug, setTenantSlug, role } = useAuth();
  const isOperator = role === "owner" || role === "staff";
  const { data: dashboardStats } = usePgDashboard(isOperator);
  const navBadges = isOperator
    ? { "/r/pg-booking-requests": dashboardStats?.pending_bookings ?? 0 }
    : undefined;
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
    queryKey: scopeTenant(tenantSlug, "branding"),
    queryFn: async () => {
      try {
        const { data } = await api.get("/cosmetix/branding/resolve/");
        return data as { name?: string; favicon_url?: string; css_vars?: Record<string, string> };
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (branding?.favicon_url && link) {
      link.href = branding.favicon_url;
    }
  }, [branding?.favicon_url]);

  const cssVars = branding?.css_vars;
  useEffect(() => {
    if (!cssVars) return;
    for (const [k, v] of Object.entries(cssVars)) {
      document.documentElement.style.setProperty(k, v);
    }
  }, [cssVars]);

  const headerTitle = branding?.name ?? "SaaSStack";
  const tenantLabel =
    myTenants?.find((t) => t.slug === tenantSlug)?.name ?? tenantSlug;
  const isSchoolBus =
    tenantSlug === "sb-demo" ||
    tenantSlug.startsWith("sb-") ||
    location.pathname.startsWith("/sb/");
  const productLabel = isSchoolBus ? "School Bus" : "PG Management";

  const tenantSelect = (
    <>
      <label className="sidebar-label" htmlFor="tenant-select">
        Property
      </label>
      {myTenants && myTenants.length > 0 ? (
        <select
          id="tenant-select"
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
          id="tenant-select"
          className="sidebar-tenant-select"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
        />
      )}
    </>
  );

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}`}>
      <aside id="app-sidebar" className="sidebar" aria-hidden={isMobile ? !menuOpen : false}>
        <div className="sidebar-brand-block">
          <h1 className="sidebar-brand-name">{branding?.name ?? "SaaSStack"}</h1>
          <p className="sidebar-brand-sub">{productLabel}</p>
        </div>
        <div className="sidebar-tenant-block">{tenantSelect}</div>
        <NavBar badges={navBadges} />
        <hr className="sidebar-divider" />
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
        <header className="app-topbar desktop-only">
          <span className="app-topbar-title">{headerTitle}</span>
          <span className="muted app-topbar-tenant">{tenantLabel}</span>
          {isOperator && <NotificationBell stats={dashboardStats} />}
        </header>
        <MobileHeader
          title={headerTitle}
          subtitle={tenantLabel}
          menuOpen={menuOpen}
          onMenuToggle={toggleMenu}
          trailing={isOperator ? <NotificationBell stats={dashboardStats} /> : undefined}
        />
        <main className="main content-max">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
