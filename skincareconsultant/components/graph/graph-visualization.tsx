"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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

function GraphNode({
  node,
  isSelected,
  isHighlighted,
  onSelect,
}: {
  node: GraphNode
  isSelected: boolean
  isHighlighted: boolean
  onSelect: (node: GraphNode) => void
}) {
  const config = nodeTypeConfig[node.type]

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className={cn(
        "rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
        config.bgColor,
        config.color,
        isSelected && "ring-2 ring-ring ring-offset-2",
        isHighlighted && "scale-105 shadow-md",
        !isSelected && !isHighlighted && "opacity-100 hover:opacity-80"
      )}
      aria-pressed={isSelected}
      aria-label={`${node.label}, ${config.label}`}
    >
      {node.label}
    </button>
  )
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
  const [filterType, setFilterType] = useState<NodeType | "all">("all")

  const filteredNodes = useMemo(() => {
    if (filterType === "all") return graph.nodes
    return graph.nodes.filter((n) => n.type === filterType)
  }, [graph.nodes, filterType])

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>()
    const ids = new Set<string>()
    graph.edges.forEach((edge) => {
      if (edge.from === selectedNode.id) ids.add(edge.to)
      if (edge.to === selectedNode.id) ids.add(edge.from)
    })
    return ids
  }, [selectedNode, graph.edges])

  const relatedEdges = useMemo(() => {
    if (!selectedNode) return []
    return graph.edges.filter(
      (edge) => edge.from === selectedNode.id || edge.to === selectedNode.id
    )
  }, [selectedNode, graph.edges])

  const groupedNodes = useMemo(() => {
    return {
      ingredients: filteredNodes.filter((n) => n.type === "ingredient"),
      families: filteredNodes.filter((n) => n.type === "family"),
      concerns: filteredNodes.filter((n) => n.type === "concern"),
    }
  }, [filteredNodes])

  return (
    <div className={cn("grid gap-6 lg:grid-cols-[1fr_320px]", className)}>
      {/* Main visualization area */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Ingredient Map</h2>
          <div className="flex gap-2">
            {(["all", "ingredient", "family", "concern"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filterType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {type === "all" ? "All" : nodeTypeConfig[type].label}
              </button>
            ))}
          </div>
        </div>

        {/* Node grid */}
        <div className="space-y-6">
          {(filterType === "all" || filterType === "ingredient") && groupedNodes.ingredients.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Ingredients</h3>
              <div className="flex flex-wrap gap-2">
                {groupedNodes.ingredients.map((node) => (
                  <GraphNode
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    isHighlighted={connectedNodeIds.has(node.id)}
                    onSelect={setSelectedNode}
                  />
                ))}
              </div>
            </div>
          )}

          {(filterType === "all" || filterType === "family") && groupedNodes.families.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Families</h3>
              <div className="flex flex-wrap gap-2">
                {groupedNodes.families.map((node) => (
                  <GraphNode
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    isHighlighted={connectedNodeIds.has(node.id)}
                    onSelect={setSelectedNode}
                  />
                ))}
              </div>
            </div>
          )}

          {(filterType === "all" || filterType === "concern") && groupedNodes.concerns.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Skin Concerns</h3>
              <div className="flex flex-wrap gap-2">
                {groupedNodes.concerns.map((node) => (
                  <GraphNode
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    isHighlighted={connectedNodeIds.has(node.id)}
                    onSelect={setSelectedNode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-4 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Legend:</span>
          </div>
          {Object.entries(edgeTypeConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1 text-xs">
              <span className={config.color}>{config.symbol}</span>
              <span className="text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
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
