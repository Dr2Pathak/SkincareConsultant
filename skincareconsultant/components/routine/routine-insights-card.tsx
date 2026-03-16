"use client"

import { AlertTriangle, CheckCircle2, Sparkles, Beaker } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RoutineInsights } from "@/lib/types"

interface RoutineInsightsCardProps {
  insights: RoutineInsights | null
  loading?: boolean
  /** When true, server had at least one product in the routine (from API). Falls back to true if not provided. */
  hasRoutineProducts?: boolean
  className?: string
}

export function RoutineInsightsCard({
  insights,
  loading = false,
  hasRoutineProducts,
  className,
}: RoutineInsightsCardProps) {
  const hasProducts = hasRoutineProducts ?? insights?.hasRoutineProducts ?? true
  const hasConflicts = (insights?.conflicts?.length ?? 0) > 0
  const hasHelps = (insights?.helps?.length ?? 0) > 0
  const isEmpty = !hasConflicts && !hasHelps

  return (
    <section
      className={cn("rounded-xl border border-border bg-card p-5", className)}
      aria-label="Ingredient insights for your routine"
    >
      <div className="flex items-center gap-2 mb-4">
        <Beaker className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Ingredient insights</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Based on your current routine — conflicts and benefits from our ingredient knowledge graph.
      </p>

      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <span className="text-sm">Loading insights…</span>
        </div>
      )}

      {!loading && !hasProducts && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">
            Add products to your routine and save to see ingredient conflicts and benefits here.
          </p>
        </div>
      )}

      {!loading && hasProducts && isEmpty && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">
            No specific conflicts or benefits found for your current products. Keep building your routine.
          </p>
        </div>
      )}

      {!loading && hasProducts && !isEmpty && (
        <div className="space-y-4">
          {hasConflicts && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-caution" aria-hidden="true" />
                Conflicts & caution
              </h3>
              <ul className="space-y-2" role="list">
                {insights!.conflicts.map((c, i) => (
                  <li
                    key={`${c.aLabel}-${c.bLabel}-${i}`}
                    className="rounded-lg border border-caution/20 bg-caution/5 p-3 text-sm"
                  >
                    <span className="font-medium text-foreground">{c.aLabel}</span>
                    <span className="text-muted-foreground"> may conflict with </span>
                    <span className="font-medium text-foreground">{c.bLabel}</span>
                    <span className="text-muted-foreground"> — avoid combining or use on alternate days.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasHelps && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Benefits
              </h3>
              <ul className="space-y-2" role="list">
                {insights!.helps.map((h, i) => (
                  <li
                    key={`${h.ingredient}-${i}`}
                    className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"
                  >
                    <span className="font-medium text-foreground">{h.ingredient}</span>
                    <span className="text-muted-foreground"> supports: </span>
                    <span className="text-foreground">{h.targets.join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!loading && (hasRoutineProducts || hasConflicts || hasHelps) && (
        <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-4">
          For educational and guidance purposes only. Not a substitute for professional advice. Patch test new products.
        </p>
      )}
    </section>
  )
}
