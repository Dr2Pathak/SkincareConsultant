import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
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
