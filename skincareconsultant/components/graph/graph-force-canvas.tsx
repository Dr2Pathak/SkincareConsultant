"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import type { KnowledgeGraph, GraphNode, NodeType, EdgeType } from "@/lib/types"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false })

const NODE_COLORS: Record<NodeType, string> = {
  ingredient: "#6366f1",
  family: "#22c55e",
  concern: "#f59e0b",
}

const LINK_COLORS: Record<EdgeType, string> = {
  belongs_to: "#94a3b8",
  conflicts_with: "#ef4444",
  helps: "#22c55e",
}

interface GraphForceCanvasProps {
  graph: KnowledgeGraph
  width?: number
  height?: number
  onNodeClick?: (node: GraphNode | null) => void
  className?: string
}

export function GraphForceCanvas({ graph, width = 800, height = 500, onNodeClick, className }: GraphForceCanvasProps) {
  const { nodes, links } = useMemo(() => {
    const nodes = graph.nodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
    }))
    const links = graph.edges.map((e) => ({
      source: e.from,
      target: e.to,
      type: e.type,
    }))
    return { nodes, links }
  }, [graph])

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links])

  return (
    <div className={className} style={{ width: "100%", minHeight: height }}>
      <ForceGraph2D
        graphData={graphData}
        width={width}
        height={height}
        nodeLabel={(n) => (n as { label?: string }).label ?? (n as { id?: string }).id ?? ""}
        nodeColor={(n) => NODE_COLORS[(n as { type?: NodeType }).type ?? "ingredient"]}
        linkColor={(l) => LINK_COLORS[(l as { type?: EdgeType }).type ?? "helps"]}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        onNodeClick={(n) => onNodeClick?.(n ? { id: (n as { id?: string }).id ?? "", label: (n as { label?: string }).label ?? "", type: (n as { type?: NodeType }).type ?? "ingredient" } : null)}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = (node as { label?: string }).label ?? (node as { id?: string }).id ?? ""
          const fontSize = 12 / globalScale
          ctx.font = `${fontSize}px Sans-Serif`
          const textWidth = ctx.measureText(label).width
          const bgrPadding = 4
          const pad = bgrPadding * 2
          ctx.fillStyle = "rgba(255,255,255,0.9)"
          ctx.strokeStyle = (node as { type?: NodeType }).type ? NODE_COLORS[(node as { type?: NodeType }).type ?? "ingredient"] : "#6366f1"
          ctx.lineWidth = 1.5 / globalScale
          ctx.beginPath()
          const x = (node.x ?? 0) - textWidth / 2 - bgrPadding
          const y = (node.y ?? 0) - fontSize / 2 - bgrPadding
          ctx.rect(x, y, textWidth + pad, fontSize + pad)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = "#1e293b"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(label, node.x ?? 0, node.y ?? 0)
        }}
      />
    </div>
  )
}
