import { describe, it, expect } from "vitest"
import { buildGraph } from "./build-graph"
import type { AmabohIngredient } from "./parse-amaboh"
import type { CosIngRow } from "./parse-cosing"
import type { CuratedRules } from "./load-curated-rules"

describe("buildGraph", () => {
  it("produces nodes and edges matching types", () => {
    const amaboh: AmabohIngredient[] = [
      {
        id: "niacinamide",
        name: "Niacinamide",
        who_should_avoid: "",
        who_is_it_good_for: "acne, pigmentation",
        what_does_it_do: "",
        what_is_it: "",
        short_description: "",
        scientific_name: "",
      },
      {
        id: "retinol",
        name: "Retinol",
        who_should_avoid: "",
        who_is_it_good_for: "anti-aging",
        what_does_it_do: "",
        what_is_it: "",
        short_description: "",
        scientific_name: "",
      },
    ]
    const cosing: CosIngRow[] = []
    const rules: CuratedRules = {
      conflicts_with: [{ from: "retinol", to: "aha" }],
      belongs_to: [{ ingredient: "niacinamide", family: "antioxidants" }],
    }
    const { nodes, edges } = buildGraph(amaboh, cosing, rules)
    expect(Array.isArray(nodes)).toBe(true)
    expect(Array.isArray(edges)).toBe(true)
    const ingredientNodes = nodes.filter((n) => n.type === "ingredient")
    expect(ingredientNodes.some((n) => n.id === "niacinamide")).toBe(true)
    expect(edges.some((e) => e.type === "helps" && e.from === "niacinamide")).toBe(true)
    expect(edges.some((e) => e.type === "conflicts_with" && e.from === "retinol")).toBe(true)
    expect(edges.some((e) => e.type === "belongs_to" && e.from === "niacinamide")).toBe(true)
    for (const n of nodes) {
      expect(n).toHaveProperty("id")
      expect(n).toHaveProperty("label")
      expect(["ingredient", "family", "concern"]).toContain(n.type)
    }
    for (const e of edges) {
      expect(e).toHaveProperty("from")
      expect(e).toHaveProperty("to")
      expect(["belongs_to", "conflicts_with", "helps"]).toContain(e.type)
    }
  })
})
