/**
 * Shared routine knowledge from Neo4j: conflicts and helps for ingredients in the user's routine.
 * Used by chat (prompt context) and by the routine page (RoutineInsightsCard via /api/routine-insights).
 */

import { getSupabaseServer } from "@/lib/supabase/server"
import { getNeo4jDriver } from "@/lib/neo4j"
import { getNeo4jEnvError } from "@/lib/env"
import { resolveInciListToNodeIds } from "@/lib/inci-resolver"

export interface RoutineKnowledgeConflict {
  aLabel: string
  bLabel: string
}

export interface RoutineKnowledgeHelp {
  ingredient: string
  targets: string[]
}

export interface RoutineKnowledgeInsights {
  conflicts: RoutineKnowledgeConflict[]
  helps: RoutineKnowledgeHelp[]
}

/**
 * Fetch conflicts and helps from the knowledge graph for products in the routine.
 * Returns null when Neo4j is not configured or on error (caller can treat as empty).
 */
export async function getRoutineKnowledgeInsights(
  productIds: string[]
): Promise<RoutineKnowledgeInsights | null> {
  if (productIds.length === 0) return { conflicts: [], helps: [] }
  if (getNeo4jEnvError()) return null

  try {
    const supabase = getSupabaseServer()
    const { data: products } = await supabase
      .from("products")
      .select("id, inci_list")
      .in("id", productIds)
    const allInci = (products ?? []).flatMap((p) =>
      (Array.isArray(p.inci_list) ? p.inci_list : []) as string[]
    )
    const ids = resolveInciListToNodeIds(allInci)
    if (ids.length === 0) return { conflicts: [], helps: [] }

    const driver = getNeo4jDriver()
    const session = driver.session()
    const conflicts: RoutineKnowledgeConflict[] = []
    const helpsMap = new Map<string, string[]>()

    try {
      const conflictRes = await session.run(
        `MATCH (a)-[:CONFLICTS_WITH]->(b)
         WHERE a.id IN $ids OR b.id IN $ids
         RETURN a.id AS aId, a.label AS aLabel, b.id AS bId, b.label AS bLabel`,
        { ids }
      )
      const seen = new Set<string>()
      for (const r of conflictRes.records) {
        const aLabel = (r.get("aLabel") ?? r.get("aId") ?? "").toString()
        const bLabel = (r.get("bLabel") ?? r.get("bId") ?? "").toString()
        const key = [aLabel, bLabel].sort().join("|")
        if (!seen.has(key)) {
          seen.add(key)
          conflicts.push({ aLabel, bLabel })
        }
      }

      const helpsRes = await session.run(
        `MATCH (a)-[:HELPS]->(b)
         WHERE a.id IN $ids
         RETURN a.id AS aId, a.label AS aLabel, b.id AS bId, b.label AS bLabel
         LIMIT 50`,
        { ids }
      )
      for (const r of helpsRes.records) {
        const aLabel = (r.get("aLabel") ?? r.get("aId") ?? "").toString()
        const bLabel = (r.get("bLabel") ?? r.get("bId") ?? "").toString()
        if (!helpsMap.has(aLabel)) helpsMap.set(aLabel, [])
        helpsMap.get(aLabel)!.push(bLabel)
      }
    } finally {
      await session.close()
    }

    const helps: RoutineKnowledgeHelp[] = Array.from(helpsMap.entries()).map(([ingredient, targets]) => ({
      ingredient,
      targets: targets.slice(0, 10),
    }))

    return { conflicts, helps }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.warn("getRoutineKnowledgeInsights failed", { error: msg })
    return null
  }
}
