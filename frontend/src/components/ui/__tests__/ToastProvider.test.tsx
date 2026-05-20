import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "../ToastProvider";

function Trigger() {
  const { success, error } = useToast();
  return (
    <>
      <button type="button" onClick={() => success("Saved")}>
        ok
      </button>
      <button type="button" onClick={() => error("Failed")}>
        fail
      </button>
    </>
  );
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows success and error toasts", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("ok"));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    fireEvent.click(screen.getByText("fail"));
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("auto-dismisses after timeout", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("ok"));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });
});
