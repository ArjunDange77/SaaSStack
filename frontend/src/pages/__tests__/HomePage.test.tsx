import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "../HomePage";

const mockGet = vi.fn();

vi.mock("@/api/client", () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}));

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({
      data: [{ slug: "pg-rooms", title: "Rooms", description: "PG rooms" }],
    });
  });

  it("lists catalog resources from API", async () => {
    renderHome();
    expect(screen.getByText("Platform kernel")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Rooms" })).toHaveAttribute("href", "/r/pg-rooms");
    });
    expect(screen.getByText(/PG rooms/)).toBeInTheDocument();
  });
});
