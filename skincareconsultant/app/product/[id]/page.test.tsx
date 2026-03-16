import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Product } from "@/lib/types"

vi.mock("@/lib/data-server", () => ({
  getProductById: vi.fn((id: string) =>
    id === "1"
      ? Promise.resolve({
          id: "1",
          name: "Test Product",
          brand: "Test Brand",
          inciList: ["Water", "Glycerin"],
        } as Product)
      : Promise.resolve(null)
  ),
  getCompatibilityServer: vi.fn(() =>
    Promise.resolve({
      verdict: "ready" as const,
      score: 80,
      scoreLabel: "Good fit",
      summary: "Looks compatible.",
      reasons: [],
    })
  ),
}))

import ProductPage from "./page"

describe("ProductPage", () => {
  it("renders product details for valid id", async () => {
    const props = { params: Promise.resolve({ id: "1" }) }
    const jsx = await ProductPage(props)
    render(jsx)
    expect(screen.getByRole("link", { name: /back to product check/i })).toBeInTheDocument()
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(screen.getByText(/compatibility with your profile/i)).toBeInTheDocument()
  })

  it("throws for invalid id", async () => {
    const props = { params: Promise.resolve({ id: "nonexistent-id-999" }) }
    await expect(ProductPage(props)).rejects.toThrow()
  })
})
