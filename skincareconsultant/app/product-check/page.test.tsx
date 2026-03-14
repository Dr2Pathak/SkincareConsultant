import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductCheckPage from "./page";

describe("ProductCheckPage", () => {
  it("renders product check heading and search", () => {
    render(<ProductCheckPage />);
    expect(screen.getByRole("heading", { name: /product compatibility check/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search products/i })).toBeInTheDocument();
  });
});
