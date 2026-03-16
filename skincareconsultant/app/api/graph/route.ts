/**
 * GET /api/graph — returns knowledge graph (nodes, edges) from Neo4j.
 */

import { NextResponse } from "next/server"
import { getNeo4jEnvError } from "@/lib/env"
import { getNeo4jDriver } from "@/lib/neo4j"
import type { KnowledgeGraph, GraphNode, GraphEdge } from "@/lib/types"

export async function GET() {
  const envError = getNeo4jEnvError()
  if (envError) {
    return NextResponse.json({ error: envError }, { status: 503 })
  }

  try {
    const driver = getNeo4jDriver()
    const session = driver.session()

    try {
      const nodesResult = await session.run(
        "MATCH (n) WHERE n.id IS NOT NULL RETURN n.id AS id, n.label AS label, n.type AS type"
      )
      const nodes: GraphNode[] = nodesResult.records.map((r) => ({
        id: r.get("id"),
        label: r.get("label") ?? r.get("id"),
        type: (r.get("type") ?? "ingredient") as GraphNode["type"],
      }))

      const edgesResult = await session.run(
        "MATCH (a)-[r]->(b) WHERE a.id IS NOT NULL AND b.id IS NOT NULL RETURN a.id AS from, b.id AS to, type(r) AS type"
      )
      const edges: GraphEdge[] = edgesResult.records.map((r) => ({
        from: r.get("from"),
        to: r.get("to"),
        type: (r.get("type")?.toLowerCase() ?? "helps") as GraphEdge["type"],
      }))

      const graph: KnowledgeGraph = { nodes, edges }
      return NextResponse.json(graph)
    } finally {
      await session.close()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/graph failed", { error: message })
    return NextResponse.json(
      { error: "Failed to load knowledge graph" },
      { status: 500 }
    )
  }
}
