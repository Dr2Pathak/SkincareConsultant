import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import IngredientsPage from "./page";

describe("IngredientsPage", () => {
  it("renders knowledge graph or ingredient map heading", () => {
    render(<IngredientsPage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/ingredient|knowledge|graph|map/i);
  });
});
