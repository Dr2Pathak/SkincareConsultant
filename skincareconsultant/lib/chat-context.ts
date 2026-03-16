/**
 * Build extra context for the chat from the knowledge graph (Neo4j) for the user's routine.
 * Uses shared getRoutineKnowledgeInsights and formats to a string for the system prompt.
 */

import { getRoutineKnowledgeInsights } from "@/lib/routine-knowledge"

/**
 * Fetch INCI-based knowledge graph context for products in the user's routine.
 * Returns a string to inject into the chat system prompt, or "" if Neo4j/products unavailable.
 */
export async function getRoutineKnowledgeContext(productIds: string[]): Promise<string> {
  const insights = await getRoutineKnowledgeInsights(productIds)
  if (!insights || (insights.conflicts.length === 0 && insights.helps.length === 0)) return ""

  const parts: string[] = [
    "\n\nKnowledge graph (for ingredients in the user's routine):",
    "Use this when giving routine-specific advice.",
  ]
  if (insights.conflicts.length > 0) {
    parts.push(
      "",
      "Conflicts / caution:",
      ...insights.conflicts.map(
        (c) => `- ${c.aLabel} may conflict with ${c.bLabel} (avoid combining or alternate days).`
      )
    )
  }
  if (insights.helps.length > 0) {
    parts.push(
      "",
      "Benefits (helps):",
      ...insights.helps.map((h) => `- ${h.ingredient} supports: ${h.targets.slice(0, 8).join(", ")}.`)
    )
  }
  return parts.join("\n")
}
