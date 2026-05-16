import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@/auth/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    accessToken: "test-token",
    user: { username: "admin", role: "owner" },
    tenantSlug: "pg-demo",
    role: "owner" as const,
    residentId: null,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    setTenantSlug: vi.fn(),
    refreshMe: vi.fn(),
  }),
}));
