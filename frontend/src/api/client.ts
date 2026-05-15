import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

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

export async function login(username: string, password: string) {
  const { data } = await api.post<{ access: string; refresh: string }>("/auth/login/", {
    username,
    password,
  });
  localStorage.setItem("access", data.access);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get("/accounts/me/");
  return data;
}
