import { screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SbAttendancePage } from "../school_bus/SbAttendancePage";
import { renderWithQuery } from "@/test/test-utils";
import { useSbAttendanceHistory, useSbAttendanceSummary } from "@/hooks/useSchoolBus";

vi.mock("@/hooks/useSchoolBus", () => ({
  useSbAttendanceHistory: vi.fn(),
  useSbAttendanceSummary: vi.fn(),
}));

const mockHistory = vi.mocked(useSbAttendanceHistory);
const mockSummary = vi.mocked(useSbAttendanceSummary);

describe("SbAttendancePage", () => {
  beforeEach(() => {
    mockSummary.mockReturnValue({
      data: {
        stats: {
          school_days: 14,
          avg_attendance_rate: 0.88,
          total_absences: 2,
          low_attendance_count: 0,
        },
        low_attendance_students: [],
        students: [
          {
            id: 5,
            name: "Student 01",
            stop_name: "Stop A",
            route_name: "Morning A",
            attendance_rate: 0.93,
            attendance_dots: ["present"],
            is_low_attendance: false,
          },
        ],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSbAttendanceSummary>);
    mockHistory.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSbAttendanceHistory>);
  });

  it("renders student attendance row", () => {
    renderWithQuery(
      <MemoryRouter>
        <SbAttendancePage />
      </MemoryRouter>
    );
    expect(screen.getByText("Attendance")).toBeInTheDocument();
    expect(screen.getByText("Student 01")).toBeInTheDocument();
    expect(screen.getByText(/Morning A/)).toBeInTheDocument();
  });
});
