/**
 * Load and validate curated_rules.json (conflicts_with, belongs_to).
 */

import * as fs from "fs"
import * as path from "path"
import { resolveConfigPath } from "./load-config"

export interface ConflictRule {
  from: string
  to: string
}

export interface BelongsToRule {
  ingredient: string
  family: string
}

export interface CuratedRules {
  conflicts_with: ConflictRule[]
  belongs_to?: BelongsToRule[]
}

const DEFAULT_RULES: CuratedRules = {
  conflicts_with: [],
  belongs_to: [],
}

/**
 * Load curated rules from path in config. Returns default if file missing or invalid.
 */
export function loadCuratedRules(configCuratedPath: string): CuratedRules {
  const resolved = resolveConfigPath(configCuratedPath)
  if (!fs.existsSync(resolved)) {
    console.warn("Curated rules file missing, using empty rules:", resolved)
    return DEFAULT_RULES
  }
  const raw = fs.readFileSync(resolved, "utf-8")
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    console.warn("Curated rules file invalid JSON, using empty rules:", resolved)
    return DEFAULT_RULES
  }
  if (!data || typeof data !== "object") {
    console.warn("Curated rules file invalid shape, using empty rules")
    return DEFAULT_RULES
  }
  const obj = data as Record<string, unknown>
  const conflicts_with = Array.isArray(obj.conflicts_with)
    ? (obj.conflicts_with as ConflictRule[]).filter(
        (r) => typeof r?.from === "string" && typeof r?.to === "string"
      )
    : []
  const belongs_to = Array.isArray(obj.belongs_to)
    ? (obj.belongs_to as BelongsToRule[]).filter(
        (r) => typeof r?.ingredient === "string" && typeof r?.family === "string"
      )
    : []
  return { conflicts_with, belongs_to }
}
