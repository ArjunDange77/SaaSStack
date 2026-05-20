import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("leaflet", () => {
  const layer = { addTo: vi.fn() };
  return {
    default: {
      map: vi.fn(() => ({
        setView: vi.fn(),
        getZoom: vi.fn(() => 15),
        remove: vi.fn(),
      })),
      tileLayer: vi.fn(() => layer),
      circleMarker: vi.fn(() => ({
        addTo: vi.fn(() => ({ bindTooltip: vi.fn() })),
        setLatLng: vi.fn(),
      })),
    },
  };
});

import { LiveBusMap } from "../LiveBusMap";

describe("LiveBusMap", () => {
  it("renders map container when coordinates provided", () => {
    const { container } = render(
      <LiveBusMap latitude="15.49" longitude="73.82" lastUpdated="2026-05-20T09:00:00Z" />
    );
    expect(container.querySelector(".sb-live-map")).toBeTruthy();
    expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
  });

  it("shows placeholder when coordinates missing", () => {
    render(<LiveBusMap latitude="" longitude="" />);
    expect(screen.getByText(/Location unavailable/i)).toBeInTheDocument();
  });
});
