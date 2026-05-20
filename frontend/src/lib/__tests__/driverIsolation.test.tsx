import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { postLoginPath } from "@/lib/postLoginPath";
import { canAccessPath } from "@/lib/resolvePostLoginTarget";

function ProtectedStub({
  role,
  driverId,
  children,
}: {
  role: string | null;
  driverId: number | null;
  children: React.ReactNode;
}) {
  const path = window.location.pathname;
  const isDriverPortal =
    role === "driver" ||
    (driverId != null && role !== "owner" && role !== "staff" && role !== "parent");
  if (isDriverPortal) {
    const onDriver = path === "/sb/driver" || path.startsWith("/sb/driver/");
    if (!onDriver) {
      return <div data-testid="redirect-driver">/sb/driver</div>;
    }
  }
  return <>{children}</>;
}

describe("driver isolation routing", () => {
  it("postLoginPath sends driver role to driver portal", () => {
    expect(postLoginPath("driver", "sai-baba-school-bus", 1, null)).toBe("/sb/driver");
  });

  it("canAccessPath denies operator routes for driver role", () => {
    expect(canAccessPath("/sb/notifications", { role: "driver", driver_id: 1 })).toBe(false);
    expect(canAccessPath("/sb/dashboard", { role: "driver", driver_id: 1 })).toBe(false);
    expect(canAccessPath("/r/sb-students", { role: "driver", driver_id: 1 })).toBe(false);
    expect(canAccessPath("/sb/driver/trip/1", { role: "driver", driver_id: 1 })).toBe(true);
  });

  it("canAccessPath allows operator routes for owner", () => {
    expect(canAccessPath("/sb/notifications", { role: "owner" })).toBe(true);
  });

  it("redirects driver away from notifications path", () => {
    render(
      <MemoryRouter initialEntries={["/sb/notifications"]}>
        <Routes>
          <Route
            path="*"
            element={
              <ProtectedStub role="driver" driverId={1}>
                <div>Notifications page</div>
              </ProtectedStub>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId("redirect-driver")).toHaveTextContent("/sb/driver");
    expect(screen.queryByText("Notifications page")).toBeNull();
  });
});
