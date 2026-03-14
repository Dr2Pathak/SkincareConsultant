import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("Home", () => {
  it("renders landing heading and value prop", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /personal skincare consultant/i })).toBeInTheDocument();
    const match = screen.getAllByText(/compatibility|routine|ingredients/i);
    expect(match.length).toBeGreaterThan(0);
  });

  it("renders links for product-check, routine, onboarding, chat", () => {
    render(<HomePage />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((el) => el.getAttribute("href") ?? "").join(" ");
    expect(hrefs).toMatch(/product-check|routine|onboarding|chat|ingredients/);
  });
});
