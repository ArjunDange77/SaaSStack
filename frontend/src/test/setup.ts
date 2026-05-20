import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: query.includes("min-width"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

window.scrollTo = vi.fn();

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
