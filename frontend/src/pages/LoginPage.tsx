import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { apiErrorMessage } from "@/api/client";

export function LoginPage() {
  const { login, isAuthenticated, role, driverId } = useAuth();
  const { success, error: toastError } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenant, setTenant] = useState(
    () => localStorage.getItem("tenant_slug") || "sb-demo"
  );
  const [error, setError] = useState("");

  if (isAuthenticated) {
    const dest =
      role === "resident"
        ? "/resident"
        : role === "parent"
          ? "/sb/parent"
          : driverId
            ? "/sb/driver"
            : "/dashboard";
    return <Navigate to={dest} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password, tenant);
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
          <input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="sb-demo" />
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
    </div>
  );
}
