"use client"

import { useState } from "react"
import { ChevronRight, Sparkles, AlertTriangle, XCircle, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { IngredientNote } from "@/lib/types"

interface IngredientHighlightListProps {
  notes: IngredientNote[]
  className?: string
}

const typeConfig = {
  positive: {
    icon: Sparkles,
    iconClass: "text-success",
    bgClass: "bg-success/10",
    label: "Beneficial",
  },
  neutral: {
    icon: Minus,
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted",
    label: "Neutral",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-caution",
    bgClass: "bg-caution/10",
    label: "Caution",
  },
  danger: {
    icon: XCircle,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
    label: "Concern",
  },
}

function IngredientItem({ note }: { note: IngredientNote }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = typeConfig[note.type]
  const Icon = config.icon

  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`ingredient-${note.ingredientName}`}
      >
        <div
          className={cn("flex h-8 w-8 items-center justify-center rounded-full", config.bgClass)}
        >
          <Icon className={cn("h-4 w-4", config.iconClass)} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <span className="font-medium text-foreground">{note.ingredientName}</span>
          <span className="sr-only">, {config.label}</span>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )}
          aria-hidden="true"
        />
      </button>
      {isExpanded && (
        <div
          id={`ingredient-${note.ingredientName}`}
          className="bg-muted/30 px-3 pb-3 pt-0"
        >
          <div className="ml-11 rounded-md bg-background p-3">
            <p className="text-sm text-muted-foreground leading-relaxed">{note.note}</p>
          </div>
        </div>
      )}
    </li>
  )
}

export function IngredientHighlightList({ notes, className }: IngredientHighlightListProps) {
  const groupedNotes = {
    danger: notes.filter((n) => n.type === "danger"),
    warning: notes.filter((n) => n.type === "warning"),
    positive: notes.filter((n) => n.type === "positive"),
    neutral: notes.filter((n) => n.type === "neutral"),
  }

  const sortedNotes = [
    ...groupedNotes.danger,
    ...groupedNotes.warning,
    ...groupedNotes.positive,
    ...groupedNotes.neutral,
  ]

  return (
    <section className={cn("rounded-lg border border-border bg-card", className)} aria-label="Ingredient analysis">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Key Ingredients
        </h3>
      </div>
      <ul className="divide-y divide-border" role="list">
        {sortedNotes.map((note, index) => (
          <IngredientItem key={`${note.ingredientName}-${index}`} note={note} />
        ))}
      </ul>
      {notes.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground text-center">No ingredient notes available.</p>
      )}
    </section>
  )
}
