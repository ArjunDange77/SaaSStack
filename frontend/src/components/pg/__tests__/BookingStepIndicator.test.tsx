import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BookingStepIndicator } from "../BookingStepIndicator";

describe("BookingStepIndicator", () => {
  it("marks current step active", () => {
    render(<BookingStepIndicator current="form" />);
    expect(screen.getByText("Your details")).toBeInTheDocument();
    expect(screen.getByText(/~2 min/i)).toBeInTheDocument();
  });
});
