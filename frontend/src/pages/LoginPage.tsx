import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { apiErrorMessage } from "@/api/client";
import { postLoginPath } from "@/lib/postLoginPath";

const DEFAULT_TENANT = "sai-baba-school-bus";

export function LoginPage() {
  const { login, isAuthenticated, role, driverId, parentId, tenantSlug } = useAuth();
  const { success, error: toastError } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenant, setTenant] = useState(
    () => localStorage.getItem("tenant_slug") || DEFAULT_TENANT
  );
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to={postLoginPath(role, tenantSlug, driverId, parentId)} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      const msg = "Enter username and password.";
      setError(msg);
      toastError(msg);
      return;
    }
    try {
      await login(u, p, tenant.trim());
      success("Signed in successfully");
    } catch (err) {
      const msg = apiErrorMessage(err, "Login failed. Check credentials and that the API is running.");
      setError(msg);
      toastError(msg);
    }
  };

  return (
    <div className="login-page">
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
        <button type="submit">Login</button>
      </form>
      <p className="muted login-hint">
        Goa pilot (local): <strong>kamlesh</strong> / <strong>suresh</strong> / <strong>priya</strong> — password{" "}
        <strong>admin</strong>
      </p>
    </div>
  );
}
