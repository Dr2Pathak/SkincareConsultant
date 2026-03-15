import { describe, it, expect } from "vitest"
import { normalizeInci, toSlug, buildAliasMap } from "./normalize-inci"

describe("toSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(toSlug("Glycolic Acid")).toBe("glycolic-acid")
  })
  it("strips non-alphanumeric", () => {
    expect(toSlug("Vitamin C (Ascorbic)")).toBe("vitamin-c-ascorbic")
  })
  it("returns non-empty for empty input", () => {
    expect(toSlug("  ")).toBe("unknown")
  })
})

describe("normalizeInci", () => {
  it("returns alias when present", () => {
    expect(normalizeInci("vitamin b3")).toBe("niacinamide")
    expect(normalizeInci("VITAMIN B3")).toBe("niacinamide")
  })
  it("trims and title-cases when no alias", () => {
    expect(normalizeInci("  some ingredient  ")).toBe("Some Ingredient")
  })
  it("returns empty for empty input", () => {
    expect(normalizeInci("")).toBe("")
  })
})

describe("buildAliasMap", () => {
  it("maps canonical and synonyms to canonical", () => {
    const map = buildAliasMap([
      { name: "Niacinamide", synonyms: ["Vitamin B3"] },
    ])
    expect(map["niacinamide"]).toBe("Niacinamide")
    expect(map["vitamin b3"]).toBe("Niacinamide")
  })
})
