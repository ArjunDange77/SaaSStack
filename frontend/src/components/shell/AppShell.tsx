import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useMyTenants } from "@/hooks/useResource";
import { NavBar } from "./NavBar";

export function AppShell() {
  const { user, logout, tenantSlug, setTenantSlug } = useAuth();
  const { data: myTenants } = useMyTenants(true);

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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1 style={{ fontSize: "1.1rem", marginTop: 0 }}>SaaSStack</h1>
        {branding?.name && <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{branding.name}</p>}
        <NavBar />
        <hr style={{ borderColor: "var(--border)", margin: "1rem 0" }} />
        <label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Tenant</label>
        {myTenants && myTenants.length > 0 ? (
          <select
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            style={{ width: "100%", marginBottom: "0.5rem" }}
          >
            {myTenants.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            style={{ width: "100%", marginBottom: "0.5rem" }}
          />
        )}
        <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          {user && "username" in user ? String(user.username) : "Signed in"}
        </p>
        <button type="button" className="secondary" onClick={logout}>
          Logout
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
