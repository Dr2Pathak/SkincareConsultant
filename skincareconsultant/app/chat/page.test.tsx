import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockUseAuth = vi.fn();
const mockSendChatMessage = vi.fn();
const mockGetRoutineCalendarBootstrap = vi.fn();

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/data", () => ({
  USE_MOCK: true,
  sendChatMessage: (...args: unknown[]) => mockSendChatMessage(...args),
  getRoutineCalendarBootstrap: () => mockGetRoutineCalendarBootstrap(),
}));

import ChatPage from "./page";

describe("ChatPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, signOut: () => {} });
    mockSendChatMessage.mockReset();
    mockGetRoutineCalendarBootstrap.mockReset();
    mockSendChatMessage.mockResolvedValue({ reply: "Test reply" });
  });

  it("renders chat heading and consultant title", () => {
    render(<ChatPage />);
    expect(screen.getByRole("heading", { name: /skincare consultant/i })).toBeInTheDocument();
  });

  it("shows disclaimer about guidance", () => {
    render(<ChatPage />);
    const disclaimers = screen.getAllByText(/guidance only|professional advice/i);
    expect(disclaimers.length).toBeGreaterThan(0);
  });

  it("disables message input when user is signed out", () => {
    render(<ChatPage />);
    const inputs = screen.getAllByLabelText(/message input/i) as HTMLTextAreaElement[];
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) expect(input).toBeDisabled();

    const routineSelect = screen.getByLabelText(/routine to answer for/i) as HTMLSelectElement;
    // In mock mode we auto-select a routine, but the chat input is still disabled when signed out.
    expect(routineSelect.value).toBe("mock");
  });

  it("sends chat with the selected routine payload", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, loading: false, signOut: () => {} });

    render(<ChatPage />);

    const selectEl = screen.getByLabelText(/routine to answer for/i) as HTMLSelectElement;
    expect(selectEl.value).toBe("mock");

    const inputs = screen.getAllByLabelText(/message input/i) as HTMLTextAreaElement[];
    const input = inputs[0]!;
    fireEvent.change(input, { target: { value: "hello" } });

    const sendBtn = screen.getAllByRole("button", { name: /send/i })[0]!;
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalled();
    });

    const lastCall = mockSendChatMessage.mock.calls.at(-1) as unknown[];
    expect(lastCall[0]).toBe("hello");
    const routineArg = lastCall[1] as {
      am?: Array<{ productId?: string }>
      pm?: Array<{ productId?: string }>
    };
    // `mockRoutine` in lib/mock-data uses productId "1" for the first AM step.
    expect(routineArg.am?.[0]?.productId).toBe("1");
  });
});
