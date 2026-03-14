import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OnboardingPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe("OnboardingPage", () => {
  it("renders step 1 skin type question", () => {
    render(<OnboardingPage />);
    expect(screen.getByRole("heading", { name: /skin type/i })).toBeInTheDocument();
    const skinTerms = screen.getAllByText(/oily|dry|combination/i);
    expect(skinTerms.length).toBeGreaterThan(0);
  });

  it("renders progress and step content", () => {
    render(<OnboardingPage />);
    const stepLabels = screen.getAllByText(/step \d+ of \d+/i);
    expect(stepLabels.length).toBeGreaterThan(0);
  });
});
