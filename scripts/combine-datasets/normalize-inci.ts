/**
 * Normalize ingredient names to canonical INCI.
 * Handles case, trimming, and a small alias map. Extend the map from CosIng/amaboh data in the pipeline.
 */

const DEFAULT_ALIASES: Record<string, string> = {
  "vitamin b3": "niacinamide",
  "vitamin c": "ascorbic acid",
  "ascorbic acid": "ascorbic acid",
  "ha": "sodium hyaluronate",
  "sodium hyaluronate": "sodium hyaluronate",
  "glycolic acid": "glycolic acid",
  "lactic acid": "lactic acid",
  "salicylic acid": "salicylic acid",
  "retinol": "retinol",
  "azelaic acid": "azelaic acid",
  "panthenol": "panthenol",
  "glycerin": "glycerin",
  "glycerol": "glycerin",
  "ceramide np": "ceramide np",
  "ceramide ap": "ceramide ap",
  "ceramide eop": "ceramide eop",
  "niacinamide": "niacinamide",
  "aqua": "aqua",
  "water": "aqua",
}

/**
 * Slug for use as node id: lowercase, spaces to hyphens, strip non-alphanumeric.
 */
export function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unknown"
}

/**
 * Normalize raw ingredient string to canonical INCI (for matching and display).
 * Uses alias map; if no alias, returns trimmed title-case for consistency.
 */
export function normalizeInci(
  raw: string,
  aliasMap: Record<string, string> = DEFAULT_ALIASES
): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const key = trimmed.toLowerCase()
  const canonical = aliasMap[key]
  if (canonical) return canonical
  // Title-case single words, keep multi-word as-is for INCI style
  const words = key.split(/\s+/)
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

/**
 * Build an alias map from a list of canonical INCI names (and optional synonyms).
 * Each entry maps lowercase variant -> canonical (first in list or explicit).
 */
export function buildAliasMap(
  ingredients: Array<{ name: string; synonyms?: string[] }>
): Record<string, string> {
  const map: Record<string, string> = { ...DEFAULT_ALIASES }
  for (const { name, synonyms = [] } of ingredients) {
    const canonical = name.trim()
    if (!canonical) continue
    const key = canonical.toLowerCase()
    map[key] = canonical
    for (const s of synonyms) {
      const k = s.trim().toLowerCase()
      if (k) map[k] = canonical
    }
  }
  return map
}
