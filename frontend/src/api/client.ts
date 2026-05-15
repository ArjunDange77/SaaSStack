import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
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

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (error.response?.status === 401) {
    return "Your session expired. Please sign in again.";
  }
  const detail = error.response?.data as { detail?: string } | undefined;
  if (typeof detail?.detail === "string") return detail.detail;
  if (error.response?.status === 404) return fallback;
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
