import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import IngredientsPage from "./page";

vi.mock("@/components/graph/graph-visualization", () => ({
  GraphVisualization: () => <div data-testid="graph-visualization" />,
}));

describe("IngredientsPage", () => {
  it("renders knowledge graph or ingredient map heading", () => {
    render(<IngredientsPage />);
    const heading = screen.getByRole("heading", { name: /knowledge graph/i });
    expect(heading).toBeInTheDocument();
  });

  it("shows My routine as first toggle option and Full graph as second", () => {
    render(<IngredientsPage />);
    const toggleButtons = screen.getAllByRole("button").filter(
      (b) => b.textContent === "My routine" || b.textContent === "Full graph"
    );
    const firstInToggle = toggleButtons.find((b) => b.textContent === "My routine");
    const secondInToggle = toggleButtons.find((b) => b.textContent === "Full graph");
    expect(firstInToggle).toBeDefined();
    expect(secondInToggle).toBeDefined();
    // In document order, first "My routine" should appear before "Full graph" in the same container
    const firstIndex = toggleButtons.indexOf(firstInToggle!);
    const secondIndex = toggleButtons.indexOf(secondInToggle!);
    expect(firstIndex).toBeLessThan(secondIndex);
  });
});
