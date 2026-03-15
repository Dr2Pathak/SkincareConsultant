/**
 * Build knowledge graph (nodes + edges) from amaboh ingredients, CosIng, and curated rules.
 */

import type { GraphNode, GraphEdge, NodeType, EdgeType } from "../../skincareconsultant/lib/types"
import type { AmabohIngredient } from "./parse-amaboh"
import type { CosIngRow } from "./parse-cosing"
import type { CuratedRules } from "./load-curated-rules"

const CONCERN_IDS = [
  "acne",
  "pigmentation",
  "anti-aging",
  "barrier-repair",
  "redness",
  "hydration",
  "texture",
  "sensitive-skin",
  "dark-circles",
] as const

const FAMILY_IDS = [
  "aha",
  "bha",
  "retinoids",
  "humectants",
  "antioxidants",
  "barrier-repair",
] as const

function concernLabel(id: string): string {
  const map: Record<string, string> = {
    "sensitive-skin": "Sensitive Skin",
    "anti-aging": "Anti-aging",
    "dark-circles": "Dark Circles",
  }
  return map[id] || id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " ")
}

function familyLabel(id: string): string {
  return id.toUpperCase()
}

/**
 * Parse "who_is_it_good_for" into concern slugs (comma/space separated).
 */
function parseConcerns(text: string): string[] {
  if (!text || !text.trim()) return []
  const out: string[] = []
  const parts = text.split(/[,;|\n]/).map((s) => s.trim().toLowerCase().replace(/\s+/g, "-"))
  for (const p of parts) {
    if (p && CONCERN_IDS.some((c) => c === p || c.includes(p) || p.includes(c))) {
      const match = CONCERN_IDS.find((c) => c === p || c.startsWith(p) || p.startsWith(c))
      if (match && !out.includes(match)) out.push(match)
    }
  }
  // Heuristic: map common words to concern id
  const lower = text.toLowerCase()
  if (lower.includes("acne") && !out.includes("acne")) out.push("acne")
  if ((lower.includes("pigment") || lower.includes("dark spot")) && !out.includes("pigmentation"))
    out.push("pigmentation")
  if ((lower.includes("aging") || lower.includes("wrinkle")) && !out.includes("anti-aging"))
    out.push("anti-aging")
  if ((lower.includes("hydrat") || lower.includes("dry")) && !out.includes("hydration"))
    out.push("hydration")
  if ((lower.includes("redness") || lower.includes("red")) && !out.includes("redness"))
    out.push("redness")
  if ((lower.includes("sensitive")) && !out.includes("sensitive-skin"))
    out.push("sensitive-skin")
  return [...new Set(out)]
}

export interface KnowledgeGraphResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function buildGraph(
  amaboh: AmabohIngredient[],
  cosing: CosIngRow[],
  rules: CuratedRules
): KnowledgeGraphResult {
  const nodesMap = new Map<string, GraphNode>()
  const edgesList: GraphEdge[] = []

  // Concern nodes
  for (const id of CONCERN_IDS) {
    nodesMap.set(id, { id, label: concernLabel(id), type: "concern" })
  }
  // Family nodes
  for (const id of FAMILY_IDS) {
    nodesMap.set(id, { id, label: familyLabel(id), type: "family" })
  }

  // Ingredient nodes from amaboh
  for (const ing of amaboh) {
    if (!nodesMap.has(ing.id)) {
      nodesMap.set(ing.id, {
        id: ing.id,
        label: ing.name,
        type: "ingredient",
      })
    }
    const concerns = parseConcerns(ing.who_is_it_good_for)
    for (const c of concerns) {
      if (nodesMap.has(c)) {
        edgesList.push({ from: ing.id, to: c, type: "helps" })
      }
    }
  }

  // Ingredient nodes from CosIng (merge by id)
  for (const row of cosing) {
    if (!nodesMap.has(row.id)) {
      nodesMap.set(row.id, {
        id: row.id,
        label: row.inci,
        type: "ingredient",
      })
    }
  }

  // Curated belongs_to
  for (const r of rules.belongs_to ?? []) {
    if (nodesMap.has(r.ingredient) && nodesMap.has(r.family)) {
      edgesList.push({ from: r.ingredient, to: r.family, type: "belongs_to" })
    }
  }

  // Curated conflicts_with
  for (const r of rules.conflicts_with) {
    if (nodesMap.has(r.from) && nodesMap.has(r.to)) {
      edgesList.push({ from: r.from, to: r.to, type: "conflicts_with" })
    }
  }

  const nodes = Array.from(nodesMap.values())
  const edges = edgesList
  return { nodes, edges }
}
