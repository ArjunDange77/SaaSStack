import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SbAttendanceHistory } from "../school_bus/SbAttendanceHistory";
import { renderWithQuery } from "@/test/test-utils";
import { useSbAttendanceHistory } from "@/hooks/useSchoolBus";

vi.mock("@/hooks/useSchoolBus", () => ({
  useSbAttendanceHistory: vi.fn(),
}));

const mockHistory = vi.mocked(useSbAttendanceHistory);

describe("SbAttendanceHistory", () => {
  beforeEach(() => {
    mockHistory.mockReturnValue({
      data: [
        {
          id: 1,
          trip_id: 10,
          trip_date: "2026-05-19",
          route_name: "Morning A",
          student_id: 5,
          student_name: "Student 01",
          pickup_status: "present",
          drop_status: "not_marked",
          marked_at: "2026-05-19T08:00:00Z",
        },
      ],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useSbAttendanceHistory>);
  });

  it("renders attendance rows", () => {
    renderWithQuery(
      <MemoryRouter>
        <SbAttendanceHistory />
      </MemoryRouter>
    );
    expect(screen.getByText("Attendance history")).toBeInTheDocument();
    expect(screen.getByText("Student 01")).toBeInTheDocument();
    expect(screen.getByText("Morning A")).toBeInTheDocument();
  });
});
