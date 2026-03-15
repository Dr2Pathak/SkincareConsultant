/**
 * Write pipeline outputs: products.json, nodes.json, edges.json, graph.cypher, optional RAG JSON.
 */

import * as fs from "fs"
import * as path from "path"
import type { Product } from "../../skincareconsultant/lib/types"
import type { GraphNode, GraphEdge } from "../../skincareconsultant/lib/types"
import { resolveConfigPath } from "./load-config"

export function writeOutputs(
  outputDir: string,
  products: Product[],
  nodes: GraphNode[],
  edges: GraphEdge[]
): void {
  const out = resolveConfigPath(outputDir)
  if (!fs.existsSync(out)) {
    fs.mkdirSync(out, { recursive: true })
  }

  fs.writeFileSync(
    path.join(out, "products.json"),
    JSON.stringify(products, null, 2),
    "utf-8"
  )
  fs.writeFileSync(
    path.join(out, "nodes.json"),
    JSON.stringify(nodes, null, 2),
    "utf-8"
  )
  fs.writeFileSync(
    path.join(out, "edges.json"),
    JSON.stringify(edges, null, 2),
    "utf-8"
  )

  const cypher: string[] = []
  cypher.push("// Knowledge graph - run in Neo4j Browser or cypher-shell (idempotent MERGE)")
  function escapeCypher(s: string): string {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
  }
  for (const n of nodes) {
    const label = n.type === "ingredient" ? "Ingredient" : n.type === "family" ? "Family" : "Concern"
    const id = escapeCypher(n.id)
    const labelVal = escapeCypher(n.label)
    cypher.push(`MERGE (n:${label} {id: "${id}"}) ON CREATE SET n.label = "${labelVal}", n.type = "${n.type}";`)
  }
  cypher.push("")
  for (const e of edges) {
    const rel = e.type.toUpperCase().replace(/_/g, "_")
    const from = escapeCypher(e.from)
    const to = escapeCypher(e.to)
    cypher.push(`MATCH (a {id: "${from}"}), (b {id: "${to}"}) MERGE (a)-[:${rel}]->(b);`)
  }
  fs.writeFileSync(path.join(out, "graph.cypher"), cypher.join("\n"), "utf-8")
}

/**
 * Optional: write RAG-ready chunks (ingredients and products as flat docs for embedding pipeline).
 */
export function writeRagOutputs(
  outputDir: string,
  ingredientChunks: Array<{ id: string; text: string; metadata?: Record<string, string> }>,
  productChunks: Array<{ id: string; text: string; metadata?: Record<string, string> }>
): void {
  const out = resolveConfigPath(outputDir)
  if (!fs.existsSync(out)) {
    fs.mkdirSync(out, { recursive: true })
  }
  fs.writeFileSync(
    path.join(out, "rag-ingredients.json"),
    JSON.stringify(ingredientChunks, null, 2),
    "utf-8"
  )
  fs.writeFileSync(
    path.join(out, "rag-products.json"),
    JSON.stringify(productChunks, null, 2),
    "utf-8"
  )
}
