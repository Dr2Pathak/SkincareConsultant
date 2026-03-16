import { describe, it, expect } from "vitest"
import { resolveInciToNodeId, resolveInciListToNodeIds } from "./inci-resolver"

describe("INCI resolver", () => {
  it("slugifies simple ingredients", () => {
    expect(resolveInciToNodeId("Glycolic Acid")).toBe("glycolic-acid")
    expect(resolveInciToNodeId("  Salicylic  Acid ")).toBe("salicylic-acid")
  })

  it("maps common synonyms to canonical ids", () => {
    expect(resolveInciToNodeId("Sodium Hyaluronate")).toBe("hyaluronic-acid")
    expect(resolveInciToNodeId("HA")).toBe("hyaluronic-acid")
    expect(resolveInciToNodeId("Ascorbic Acid")).toBe("vitamin-c")
    expect(resolveInciToNodeId("Ceramide NP")).toBe("ceramides")
  })

  it("returns null for empty strings", () => {
    expect(resolveInciToNodeId("")).toBeNull()
    expect(resolveInciToNodeId("   ")).toBeNull()
  })

  it("deduplicates ids for a list", () => {
    const ids = resolveInciListToNodeIds([
      "Sodium Hyaluronate",
      "Hyaluronic Acid",
      "   sodium hyaluronate   ",
    ])
    expect(ids).toEqual(["hyaluronic-acid"])
  })
})

