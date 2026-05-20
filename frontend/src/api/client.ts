import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const AUTH_EXPIRED_EVENT = "saasstack:auth-expired";

function getRefreshToken(): string | null {
  return localStorage.getItem("refresh");
}

export function clearAuthStorage() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
}

export function notifyAuthExpired() {
  clearAuthStorage();
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenant = localStorage.getItem("tenant_slug");
  if (tenant) {
    config.headers["X-Tenant"] = tenant;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error("no_refresh_token");
  }
  const { data } = await axios.post<{ access: string }>(
    `${API_BASE}/api/auth/refresh/`,
    { refresh },
    { headers: { "Content-Type": "application/json" } }
  );
  localStorage.setItem("access", data.access);
  return data.access;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || !config || config._retry) {
      return Promise.reject(error);
    }
    const url = config.url ?? "";
    if (url.includes("/auth/login/") || url.includes("/auth/refresh/")) {
      return Promise.reject(error);
    }

    config._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const access = await refreshPromise;
      config.headers.Authorization = `Bearer ${access}`;
      return api(config);
    } catch {
      notifyAuthExpired();
      return Promise.reject(error);
    }
  }
);

export function isAuthError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}

function isHtmlErrorBody(data: unknown): boolean {
  if (typeof data !== "string") return false;
  const trimmed = data.trim().toLowerCase();
  return trimmed.startsWith("<!doctype") || trimmed.startsWith("<html");
}

function formatValidationErrors(data: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === "detail" || key === "non_field_errors") continue;
    if (Array.isArray(value)) {
      parts.push(`${key.replace(/_/g, " ")}: ${value.join(", ")}`);
    } else if (typeof value === "string") {
      parts.push(`${key.replace(/_/g, " ")}: ${value}`);
    }
  }
  return parts.length ? parts.join("; ") : null;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  }
  if (!error.response) {
    return "Network error. Check your connection and try again.";
  }
  const status = error.response.status;
  if (status === 429) {
    return "Too many requests. Please wait a few minutes and try again.";
  }
  if (status === 401) {
    const url = error.config?.url ?? error.response?.config?.url ?? "";
    if (url.includes("/auth/login/") || url.includes("/auth/refresh/")) {
      return "Incorrect username or password.";
    }
    return "Your session expired. Please sign in again.";
  }
  if (status === 413) {
    return "File is too large to upload.";
  }
  const data = error.response.data;
  if (isHtmlErrorBody(data)) {
    if (status >= 500) {
      return "Server error. Please try again in a few minutes.";
    }
    return fallback;
  }
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    if (Array.isArray(record.detail)) return record.detail.map(String).join("; ");
    if (Array.isArray(record.non_field_errors)) {
      return record.non_field_errors.map(String).join("; ");
    }
    const validation = formatValidationErrors(record);
    if (validation) return validation;
  }
  if (status === 404) return fallback;
  return fallback;
}

export async function login(username: string, password: string) {
  const { data } = await api.post<{ access: string; refresh: string }>("/auth/login/", {
    username,
    password,
  });
  localStorage.setItem("access", data.access);
  localStorage.setItem("refresh", data.refresh);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get("/accounts/me/");
  return data;
}
