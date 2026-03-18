"use client"

import { useState, useEffect, useMemo } from "react"
import { GraphVisualization } from "@/components/graph/graph-visualization"
import { Disclaimer } from "@/components/disclaimer"
import { getKnowledgeGraph, getRoutineIngredientIds } from "@/lib/data"
import { USE_MOCK } from "@/lib/data"
import type { KnowledgeGraph } from "@/lib/types"

/** Build subgraph containing routine ingredients and any nodes connected to them (families, concerns). */
function subgraphForRoutineIngredients(
  fullGraph: KnowledgeGraph,
  routineIngredientIds: Set<string>
): KnowledgeGraph {
  const nodeIds = new Set<string>(routineIngredientIds)
  for (const edge of fullGraph.edges) {
    if (routineIngredientIds.has(edge.from) || routineIngredientIds.has(edge.to)) {
      nodeIds.add(edge.from)
      nodeIds.add(edge.to)
    }
  }
  const nodes = fullGraph.nodes.filter((n) => nodeIds.has(n.id))
  const edgeIds = new Set(nodes.map((n) => n.id))
  const edges = fullGraph.edges.filter(
    (e) => edgeIds.has(e.from) && edgeIds.has(e.to)
  )
  return { nodes, edges }
}

export default function IngredientsPage() {
  const [fullGraph, setFullGraph] = useState<KnowledgeGraph | null>(null)
  const [mode, setMode] = useState<"full" | "routine">("routine")
  const [routineIngredientIds, setRoutineIngredientIds] = useState<Set<string> | null>(null)
  const [loadingRoutine, setLoadingRoutine] = useState(false)

  useEffect(() => {
    getKnowledgeGraph().then(setFullGraph)
  }, [])

  useEffect(() => {
    if (mode !== "routine" || USE_MOCK) {
      setRoutineIngredientIds(null)
      return
    }
    setLoadingRoutine(true)
    getRoutineIngredientIds()
      .then(({ ingredientIds }) => {
        setRoutineIngredientIds(new Set(ingredientIds))
      })
      .catch(() => setRoutineIngredientIds(new Set()))
      .finally(() => setLoadingRoutine(false))
  }, [mode])

  const graph = useMemo(() => {
    if (!fullGraph) return null
    if (mode === "full") return fullGraph
    if (routineIngredientIds === null || routineIngredientIds.size === 0) return fullGraph
    return subgraphForRoutineIngredients(fullGraph, routineIngredientIds)
  }, [fullGraph, mode, routineIngredientIds])

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Knowledge Graph</h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              Explore how ingredients, ingredient families, and skin concerns relate to each other.
              Choose the full graph or your routine to see ingredients in context.
            </p>
          </div>
          <div className="flex rounded-lg border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setMode("routine")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "routine"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My routine
            </button>
            <button
              type="button"
              onClick={() => setMode("full")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === "full"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Full graph
            </button>
          </div>
        </div>

        {mode === "routine" && loadingRoutine && (
          <p className="text-muted-foreground">Loading your routine ingredients…</p>
        )}

        {graph ? <GraphVisualization graph={graph} /> : <p className="text-muted-foreground">Loading graph…</p>}

        <Disclaimer className="mt-8">
          Ingredient relationships are based on general skincare knowledge and may not apply to
          every formulation. Individual reactions vary.
        </Disclaimer>
      </div>
    </div>
  )
}
