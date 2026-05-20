import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { PortalRoute } from "@/components/PortalRoute";

vi.mock("@/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/auth/AuthContext";

describe("PortalRoute", () => {
  it("redirects unauthenticated users to login", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      role: null,
      driverId: null,
    } as ReturnType<typeof useAuth>);
    render(
      <MemoryRouter initialEntries={["/resident"]}>
        <Routes>
          <Route
            path="/resident"
            element={
              <PortalRoute requiredRole="resident">
                <div>Portal</div>
              </PortalRoute>
            }
          />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("renders children when role matches", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      role: "parent",
      driverId: null,
    } as ReturnType<typeof useAuth>);
    render(
      <MemoryRouter>
        <PortalRoute requiredRole="parent">
          <div>Parent portal</div>
        </PortalRoute>
      </MemoryRouter>
    );
    expect(screen.getByText("Parent portal")).toBeInTheDocument();
  });
});
