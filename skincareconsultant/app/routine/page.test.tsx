import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RoutinePage from "./page";

describe("RoutinePage", () => {
  it("renders routine heading and AM/PM tabs", () => {
    render(<RoutinePage />);
    expect(screen.getByRole("heading", { name: /your routine/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /morning|AM/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /evening|PM/i })).toBeInTheDocument();
  });

  it("renders routine health section", () => {
    render(<RoutinePage />);
    const regions = screen.getAllByRole("region", { name: /routine health/i });
    expect(regions.length).toBeGreaterThan(0);
  });
});
