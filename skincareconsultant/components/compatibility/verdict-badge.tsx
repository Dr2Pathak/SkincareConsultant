import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { VerdictType } from "@/lib/types"

interface VerdictBadgeProps {
  verdict: VerdictType
  score?: number
  scoreLabel?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const verdictConfig: Record<
  VerdictType,
  { label: string; icon: typeof CheckCircle2; className: string; description: string }
> = {
  ready: {
    label: "Ready to Try",
    icon: CheckCircle2,
    className: "bg-success text-success-foreground",
    description: "This product is compatible with your routine",
  },
  patch_test: {
    label: "Patch Test First",
    icon: AlertTriangle,
    className: "bg-caution text-caution-foreground",
    description: "Try a small area first to check for reactions",
  },
  not_recommended: {
    label: "Not Recommended",
    icon: XCircle,
    className: "bg-destructive text-destructive-foreground",
    description: "This product may cause issues with your routine",
  },
}

export function VerdictBadge({ verdict, score, scoreLabel, size = "md", className }: VerdictBadgeProps) {
  const config = verdictConfig[verdict]
  const Icon = config.icon

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3 py-1.5 text-sm gap-2",
    lg: "px-4 py-2 text-base gap-2.5",
  }

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          config.className,
          sizeClasses[size]
        )}
        role="status"
        aria-label={`Verdict: ${config.label}`}
      >
        <Icon className={iconSizes[size]} aria-hidden="true" />
        <span>{config.label}</span>
        {scoreLabel && (
          <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold">
            {scoreLabel}
          </span>
        )}
      </div>
      {score !== undefined && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Compatibility Score:</span>
          <span className="font-semibold text-foreground">{score}/100</span>
        </div>
      )}
    </div>
  )
}

export function VerdictCard({
  verdict,
  score,
  scoreLabel,
  summary,
  className,
}: VerdictBadgeProps & { summary: string }) {
  const config = verdictConfig[verdict]
  const Icon = config.icon

  return (
    <article
      className={cn(
        "rounded-xl border-2 p-6",
        verdict === "ready" && "border-success/30 bg-success/5",
        verdict === "patch_test" && "border-caution/30 bg-caution/5",
        verdict === "not_recommended" && "border-destructive/30 bg-destructive/5",
        className
      )}
      aria-labelledby="verdict-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                config.className
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="verdict-title" className="text-lg font-semibold text-foreground">
                {config.label}
              </h2>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>
        {score !== undefined && (
          <div className="flex flex-col items-center rounded-lg bg-card px-4 py-2 shadow-sm">
            <span className="text-2xl font-bold text-foreground">{scoreLabel || score}</span>
            <span className="text-xs text-muted-foreground">Score: {score}/100</span>
          </div>
        )}
      </div>
      <p className="mt-4 text-foreground leading-relaxed">{summary}</p>
    </article>
  )
}
