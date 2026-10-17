import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EmergencyAccess } from "./EmergencyAccess";
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: vi.fn() }),
  Link: ({
    children,
    to,
    onClick,
  }: {
    children: React.ReactNode;
    to: string;
    onClick?: () => void;
  }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("explicit location request", () => {
  it("requests no location on opening and ignores late results after cancellation", () => {
    let success: PositionCallback | undefined;
    const get = vi.fn((callback: PositionCallback) => {
      success = callback;
    });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: get } });
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <EmergencyAccess />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Emergency contacts and location" }));
    expect(get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use my current location" }));
    expect(get).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));
    success?.({
      coords: { latitude: 1, longitude: 2, accuracy: 30 },
      timestamp: 1000,
    } as GeolocationPosition);
    expect(screen.queryByText(/Location captured locally/)).toBeNull();
    expect(screen.getByText(/Location request cancelled/)).toBeInTheDocument();
  });
});

