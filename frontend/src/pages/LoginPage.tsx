import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/auth/AuthContext";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenant, setTenant] = useState("pg-demo");
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password, tenant);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(
          typeof detail === "string"
            ? detail
            : "Login failed. Check credentials and that the API is running."
        );
      } else {
        setError("Login failed. Check credentials and that the API is running.");
      }
    }
  };

  return (
    <div className="login-page">
      <h2>Sign in</h2>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label>Tenant slug (X-Tenant)</label>
          <input value={tenant} onChange={(e) => setTenant(e.target.value)} placeholder="pg-demo" />
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
