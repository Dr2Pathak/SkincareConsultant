import { describe, it, expect } from "vitest"
import { buildProducts } from "./build-products"
import type { RawProduct } from "./parse-products"

describe("buildProducts", () => {
  it("produces Product shape with id, name, brand, inciList", () => {
    const raw: RawProduct[] = [
      { name: "Test Serum", brand: "Brand", inciList: ["Aqua", "Niacinamide"] },
    ]
    const products = buildProducts(raw)
    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      name: "Test Serum",
      brand: "Brand",
      inciList: ["Aqua", "Niacinamide"],
    })
    expect(products[0].id).toBeDefined()
    expect(typeof products[0].id).toBe("string")
    expect(products[0].category).toBeDefined()
  })

  it("dedupes by name+brand", () => {
    const raw: RawProduct[] = [
      { name: "Same", brand: "B", inciList: [] },
      { name: "Same", brand: "B", inciList: ["Aqua"] },
    ]
    const products = buildProducts(raw)
    expect(products).toHaveLength(1)
  })
})
