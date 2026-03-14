import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatPage from "./page";

describe("ChatPage", () => {
  it("renders chat heading and consultant title", () => {
    render(<ChatPage />);
    expect(screen.getByRole("heading", { name: /skincare consultant/i })).toBeInTheDocument();
  });

  it("shows disclaimer about guidance", () => {
    render(<ChatPage />);
    const disclaimers = screen.getAllByText(/guidance only|professional advice/i);
    expect(disclaimers.length).toBeGreaterThan(0);
  });
});
