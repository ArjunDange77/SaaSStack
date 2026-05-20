import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { apiErrorMessage } from "@/api/client";
import {
  meProfileFromRecord,
  resolvePostLoginTarget,
} from "@/lib/resolvePostLoginTarget";

const DEFAULT_TENANT = "sai-baba-school-bus";

type LoginLocationState = { from?: { pathname: string; search?: string; hash?: string } };

export function LoginPage() {
  const { login, isAuthenticated, user, tenantSlug } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LoginLocationState | null)?.from;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenant, setTenant] = useState(
    () => localStorage.getItem("tenant_slug") || DEFAULT_TENANT
  );
  const [error, setError] = useState("");

  if (isAuthenticated && user) {
    const me = meProfileFromRecord(user);
    const target = resolvePostLoginTarget(me, tenantSlug, from);
    return <Navigate to={target} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setError("Enter username and password.");
      return;
    }
    try {
      const meRecord = await login(u, p, tenant.trim());
      success("Signed in successfully");
      const me = meProfileFromRecord(meRecord);
      const target = resolvePostLoginTarget(me, tenant.trim(), from);
      navigate(target, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, "Login failed. Check credentials and that the API is running."));
    }
  };

  return (
    <div className="login-page">
      <p className="login-brand muted">SaaSStack · School Bus</p>
      <h2>Sign in</h2>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Tenant slug (X-Tenant)</label>
          <input
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder={DEFAULT_TENANT}
          />
        </div>
        <div className="field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="login-submit">Login</button>
      </form>
      <p className="muted login-hint">
        Goa pilot (local): <strong>kamlesh</strong> (operator) · <strong>suresh</strong> (driver) ·{" "}
        <strong>priya</strong> (parent) — password <strong>admin</strong>
      </p>
    </div>
  );
}
