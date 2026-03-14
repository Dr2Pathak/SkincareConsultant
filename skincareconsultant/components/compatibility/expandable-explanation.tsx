"use client"

import { useState } from "react"
import { ChevronDown, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CompatibilityDimension } from "@/lib/types"

interface ExpandableExplanationProps {
  dimensions: {
    safety?: CompatibilityDimension
    goalAlignment?: CompatibilityDimension
    redundancy?: CompatibilityDimension
  }
  reasons: string[]
  className?: string
}

const statusConfig = {
  good: {
    icon: CheckCircle2,
    iconClass: "text-success",
    bgClass: "bg-success/10",
    borderClass: "border-success/20",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-caution",
    bgClass: "bg-caution/10",
    borderClass: "border-caution/20",
  },
  danger: {
    icon: XCircle,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
    borderClass: "border-destructive/20",
  },
}

function DimensionItem({ dimension }: { dimension: CompatibilityDimension }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = statusConfig[dimension.status]
  const Icon = config.icon

  return (
    <div className={cn("rounded-lg border", config.borderClass, config.bgClass)}>
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`dimension-${dimension.label}`}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5", config.iconClass)} aria-hidden="true" />
          <span className="font-medium text-foreground">{dimension.label}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      {isExpanded && (
        <div
          id={`dimension-${dimension.label}`}
          className="border-t border-border/50 px-4 pb-4 pt-3"
        >
          <p className="text-sm text-muted-foreground leading-relaxed">{dimension.description}</p>
        </div>
      )}
    </div>
  )
}

export function ExpandableExplanation({
  dimensions,
  reasons,
  className,
}: ExpandableExplanationProps) {
  const [showReasons, setShowReasons] = useState(false)

  const dimensionList = [
    dimensions.safety && { key: "safety", ...dimensions.safety },
    dimensions.goalAlignment && { key: "goalAlignment", ...dimensions.goalAlignment },
    dimensions.redundancy && { key: "redundancy", ...dimensions.redundancy },
  ].filter(Boolean) as (CompatibilityDimension & { key: string })[]

  return (
    <section className={cn("space-y-4", className)} aria-label="Detailed explanation">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Analysis Breakdown
      </h3>

      <div className="space-y-3">
        {dimensionList.map((dim) => (
          <DimensionItem key={dim.key} dimension={dim} />
        ))}
      </div>

      {reasons.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <button
            type="button"
            className="flex w-full items-center justify-between p-4 text-left"
            onClick={() => setShowReasons(!showReasons)}
            aria-expanded={showReasons}
            aria-controls="detailed-reasons"
          >
            <span className="font-medium text-foreground">Key Reasons ({reasons.length})</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                showReasons && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
          {showReasons && (
            <div id="detailed-reasons" className="border-t border-border px-4 pb-4 pt-3">
              <ul className="space-y-2" role="list">
                {reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
