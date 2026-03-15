import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import type { RoutineHealth, RoutineHealthWarning } from "@/lib/types"

interface RoutineHealthCardProps {
  health: RoutineHealth
  className?: string
}

const severityConfig = {
  info: {
    icon: Info,
    iconClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/20",
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

function WarningItem({ warning }: { warning: RoutineHealthWarning }) {
  const config = severityConfig[warning.severity]
  const Icon = config.icon

  return (
    <div className={cn("rounded-lg border p-3", config.borderClass, config.bgClass)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClass)} aria-hidden="true" />
        <div>
          <p className="font-medium text-foreground text-sm">{warning.message}</p>
          {warning.details && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{warning.details}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function RoutineHealthCard({ health, className }: RoutineHealthCardProps) {
  const scoreColor =
    health.score >= 80
      ? "text-success"
      : health.score >= 60
        ? "text-caution"
        : "text-destructive"

  const progressColor =
    health.score >= 80
      ? "bg-success"
      : health.score >= 60
        ? "bg-caution"
        : "bg-destructive"

  return (
    <section
      className={cn("rounded-xl border border-border bg-card p-5", className)}
      aria-label="Routine health summary"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Routine Health</h2>
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-bold", scoreColor)}>{health.score}</span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>

      <Progress value={health.score} className="h-2 mb-4" indicatorClassName={progressColor} />

      <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-lg bg-muted/50">
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground">{health.exfoliationLoad}</p>
          <p className="text-xs text-muted-foreground">Exfoliants</p>
        </div>
        <div className="text-center border-x border-border">
          <p className="text-2xl font-semibold text-foreground">{health.retinoidStrength}</p>
          <p className="text-xs text-muted-foreground">Retinoids</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground">{health.conflictCount}</p>
          <p className="text-xs text-muted-foreground">Conflicts</p>
        </div>
      </div>

      {health.warnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Insights & Warnings
          </h3>
          {health.warnings.map((warning) => (
            <WarningItem
              key={`${warning.type}-${warning.message}-${warning.details ?? ""}`}
              warning={warning}
            />
          ))}
        </div>
      )}

      {health.warnings.length === 0 && (
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">Your routine looks well-balanced!</span>
        </div>
      )}
    </section>
  )
}
