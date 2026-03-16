/**
 * Runtime INCI → graph node id resolution.
 *
 * Uses a slug derived from the raw INCI string plus a small synonym map so
 * common variants resolve to the same canonical graph node id.
 *
 * This mirrors the combine-datasets pipeline behavior (normalize + slug)
 * without importing build-time scripts into the runtime bundle.
 */

function toInciSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

// Map from ingredient slug -> canonical graph node id slug.
// Extend over time as we see more real-world variants.
const INCI_SYNONYM_MAP: Record<string, string> = {
  // Hydration
  "sodium-hyaluronate": "hyaluronic-acid",
  "ha": "hyaluronic-acid",

  // Vitamin C forms
  "ascorbic-acid": "vitamin-c",

  // Ceramides (common grouping)
  "ceramide-np": "ceramides",
  "ceramide-ap": "ceramides",
  "ceramide-eop": "ceramides",
}

export function resolveInciToNodeId(raw: string): string | null {
  const base = toInciSlug(raw)
  if (!base) return null
  return INCI_SYNONYM_MAP[base] ?? base
}

export function resolveInciListToNodeIds(inciList: string[]): string[] {
  const ids = new Set<string>()
  for (const raw of inciList) {
    const id = resolveInciToNodeId(raw)
    if (id) ids.add(id)
  }
  return Array.from(ids)
}

