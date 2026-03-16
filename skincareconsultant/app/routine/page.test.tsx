import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { saveRoutine } from "@/lib/data";
import RoutinePage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

type MockAuth = {
  user: { id: string } | null;
  loading: boolean;
  signOut: () => void;
};

const mockUseAuth = vi.fn<() => MockAuth>(() => ({
  user: null,
  loading: false,
  signOut: () => {},
}));

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/data", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    USE_MOCK: false,
    getRoutine: vi.fn().mockResolvedValue({ am: [], pm: [] }),
    getRoutines: vi.fn().mockResolvedValue([]),
    getRoutineHealth: vi.fn().mockResolvedValue({
      score: 100,
      warnings: [],
      exfoliationLoad: 0,
      retinoidStrength: 0,
      conflictCount: 0,
    }),
    getRoutineInsights: vi.fn().mockResolvedValue({ conflicts: [], helps: [], hasRoutineProducts: false }),
    getMockProductsForPicker: () => [],
    searchProducts: vi.fn().mockResolvedValue([]),
    saveRoutine: vi.fn().mockResolvedValue({}),
    setCurrentRoutine: vi.fn().mockResolvedValue(undefined),
    deleteRoutine: vi.fn().mockResolvedValue(undefined),
    getProduct: vi.fn().mockResolvedValue(null),
  };
});

describe("RoutinePage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, signOut: () => {} });
  });

  it("renders routine heading and AM/PM tabs", () => {
    render(<RoutinePage />);
    expect(screen.getByRole("heading", { name: /your routine/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /morning|AM/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /evening|PM/i })).toBeInTheDocument();
  });

  it("renders routine health section", () => {
    render(<RoutinePage />);
    const headings = screen.getAllByRole("heading", { name: /routine health/i });
    expect(headings.length).toBeGreaterThan(0);
  });
});

describe("RoutinePage with user", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      loading: false,
      signOut: () => {},
    });
  });

  it("renders My Routines and New routine when signed in", async () => {
    render(<RoutinePage />);
    await waitFor(() => {
      expect(screen.getAllByText(/my routines/i).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByRole("button", { name: /new routine/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("shows routine name input when signed in and save uses its value", async () => {
    vi.mocked(saveRoutine).mockClear();
    render(<RoutinePage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/routine name/i)).toBeInTheDocument();
    });
    const nameInput = screen.getByLabelText(/routine name/i);
    fireEvent.change(nameInput, { target: { value: "Summer PM" } });
    const saveBtns = screen.getAllByRole("button", { name: /save routine/i });
    fireEvent.click(saveBtns[0]!);
    await waitFor(() => {
      expect(saveRoutine).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Summer PM",
          am: expect.any(Array),
          pm: expect.any(Array),
        })
      );
    });
  });
});
