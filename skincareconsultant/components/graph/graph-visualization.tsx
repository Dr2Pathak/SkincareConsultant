"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { GraphForceCanvas } from "@/components/graph/graph-force-canvas"
import type { KnowledgeGraph, GraphNode, GraphEdge, NodeType, EdgeType } from "@/lib/types"

interface GraphVisualizationProps {
  graph: KnowledgeGraph
  className?: string
}

const nodeTypeConfig: Record<NodeType, { color: string; bgColor: string; label: string }> = {
  ingredient: {
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/30",
    label: "Ingredient",
  },
  family: {
    color: "text-chart-2",
    bgColor: "bg-chart-2/10 border-chart-2/30",
    label: "Family",
  },
  concern: {
    color: "text-chart-5",
    bgColor: "bg-chart-5/10 border-chart-5/30",
    label: "Concern",
  },
}

const edgeTypeConfig: Record<EdgeType, { color: string; label: string; symbol: string }> = {
  belongs_to: {
    color: "text-muted-foreground",
    label: "belongs to",
    symbol: "→",
  },
  conflicts_with: {
    color: "text-destructive",
    label: "conflicts with",
    symbol: "⚡",
  },
  helps: {
    color: "text-success",
    label: "helps",
    symbol: "✓",
  },
}

function EdgeItem({ edge, nodes }: { edge: GraphEdge; nodes: GraphNode[] }) {
  const fromNode = nodes.find((n) => n.id === edge.from)
  const toNode = nodes.find((n) => n.id === edge.to)
  const config = edgeTypeConfig[edge.type]

  if (!fromNode || !toNode) return null

  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={nodeTypeConfig[fromNode.type].color}>{fromNode.label}</span>
      <span className={cn("font-medium", config.color)}>
        {config.symbol} {config.label}
      </span>
      <span className={nodeTypeConfig[toNode.type].color}>{toNode.label}</span>
    </li>
  )
}

export function GraphVisualization({ graph, className }: GraphVisualizationProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  const relatedEdges = useMemo(() => {
    if (!selectedNode) return []
    return graph.edges.filter(
      (edge) => edge.from === selectedNode.id || edge.to === selectedNode.id
    )
  }, [selectedNode, graph.edges])

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[1fr_320px]", className)}>
      {/* Main: force-directed graph */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Knowledge graph</h2>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span><span className="inline-block w-2 h-2 rounded-full bg-primary" aria-hidden /> Ingredient</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-chart-2" aria-hidden /> Family</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-chart-5" aria-hidden /> Concern</span>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden bg-muted/30 min-h-[480px]">
          <GraphForceCanvas
            graph={graph}
            height={480}
            onNodeClick={setSelectedNode}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Drag nodes to rearrange; click a node to see relationships in the panel.</p>
      </div>

      {/* Sidebar - relationships */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Relationships
        </h3>

        {selectedNode ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Badge className={nodeTypeConfig[selectedNode.type].bgColor}>
                  {nodeTypeConfig[selectedNode.type].label}
                </Badge>
                <span className="font-medium text-foreground">{selectedNode.label}</span>
              </div>
            </div>

            {relatedEdges.length > 0 ? (
              <ul className="space-y-2" role="list" aria-label="Related connections">
                {relatedEdges.map((edge, index) => (
                  <EdgeItem key={index} edge={edge} nodes={graph.nodes} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No direct relationships found.</p>
            )}

            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="text-sm text-primary hover:underline"
            >
              Clear selection
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click on any node to see its relationships with other ingredients, families, and concerns.
          </p>
        )}
      </div>
    </div>
  )
}
