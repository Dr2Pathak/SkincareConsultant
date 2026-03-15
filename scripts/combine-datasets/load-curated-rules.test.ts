import { describe, it, expect, beforeEach, afterEach } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { loadCuratedRules } from "./load-curated-rules"

describe("loadCuratedRules", () => {
  const fixturesDir = path.join(__dirname, "fixtures")
  const rulesPath = path.join(fixturesDir, "curated_rules.json")

  beforeEach(() => {
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true })
  })

  afterEach(() => {
    try {
      if (fs.existsSync(rulesPath)) fs.unlinkSync(rulesPath)
    } catch {
      // ignore
    }
  })

  it("returns default when file missing", () => {
    const missingPath = path.join(fixturesDir, "nonexistent.json")
    const r = loadCuratedRules(missingPath)
    expect(r.conflicts_with).toEqual([])
    expect(r.belongs_to).toEqual([])
  })

  it("parses valid conflicts_with and belongs_to", () => {
    const absoluteRulesPath = path.resolve(rulesPath)
    fs.writeFileSync(
      absoluteRulesPath,
      JSON.stringify({
        conflicts_with: [{ from: "retinol", to: "aha" }],
        belongs_to: [{ ingredient: "retinol", family: "retinoids" }],
      }),
      "utf-8"
    )
    const r = loadCuratedRules(absoluteRulesPath)
    expect(r.conflicts_with).toHaveLength(1)
    expect(r.conflicts_with[0]).toEqual({ from: "retinol", to: "aha" })
    expect(r.belongs_to).toHaveLength(1)
    expect(r.belongs_to![0]).toEqual({ ingredient: "retinol", family: "retinoids" })
  })

  it("filters invalid entries", () => {
    const absoluteRulesPath = path.resolve(rulesPath)
    fs.writeFileSync(
      absoluteRulesPath,
      JSON.stringify({
        conflicts_with: [{ from: "a", to: "b" }, { from: "x" }, null],
        belongs_to: [{ ingredient: "i", family: "f" }, {}],
      }),
      "utf-8"
    )
    const r = loadCuratedRules(absoluteRulesPath)
    expect(r.conflicts_with).toHaveLength(1)
    expect(r.belongs_to).toHaveLength(1)
  })
})
