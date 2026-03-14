import { AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface DisclaimerProps {
  variant?: "info" | "warning"
  className?: string
  children?: React.ReactNode
}

const defaultText =
  "For educational and guidance purposes only. Not a substitute for professional medical or dermatological advice. Patch test new products."

export function Disclaimer({ variant = "info", className, children }: DisclaimerProps) {
  const Icon = variant === "warning" ? AlertCircle : Info

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        variant === "warning"
          ? "border-warning/30 bg-warning/10"
          : "border-muted bg-muted/50",
        className
      )}
      role="note"
      aria-label="Disclaimer"
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          variant === "warning" ? "text-warning-foreground" : "text-muted-foreground"
        )}
        aria-hidden="true"
      />
      <p
        className={cn(
          "text-sm leading-relaxed",
          variant === "warning" ? "text-warning-foreground" : "text-muted-foreground"
        )}
      >
        {children || defaultText}
      </p>
    </div>
  )
}
