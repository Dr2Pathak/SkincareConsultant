"use client"

import { GripVertical, Trash2, Plus, Edit2, Check, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RoutineStep, Product } from "@/lib/types"

interface RoutineStepEditorProps {
  step: RoutineStep
  products: Product[]
  onUpdate: (step: RoutineStep) => void
  onDelete: (stepId: string) => void
  className?: string
}

export function RoutineStepEditor({
  step,
  products,
  onUpdate,
  onDelete,
  className,
}: RoutineStepEditorProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editedLabel, setEditedLabel] = useState(step.label)

  const handleLabelSave = () => {
    if (editedLabel.trim()) {
      onUpdate({ ...step, label: editedLabel.trim() })
    }
    setIsEditingLabel(false)
  }

  const handleLabelCancel = () => {
    setEditedLabel(step.label)
    setIsEditingLabel(false)
  }

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    onUpdate({
      ...step,
      productId: productId === "none" ? undefined : productId,
      product: productId === "none" ? undefined : product,
    })
  }

  return (
    <article
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/30",
        className
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {step.order}
      </div>

      <div className="flex-1 min-w-0">
        {isEditingLabel ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedLabel}
              onChange={(e) => setEditedLabel(e.target.value)}
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLabelSave()
                if (e.key === "Escape") handleLabelCancel()
              }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleLabelSave}>
              <Check className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Save label</span>
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleLabelCancel}>
              <X className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Cancel editing</span>
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
            onClick={() => setIsEditingLabel(true)}
          >
            {step.label}
            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
            <span className="sr-only">Edit label</span>
          </button>
        )}

        {step.product && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {step.product.name} - {step.product.brand}
          </p>
        )}
      </div>

      <Select
        value={step.productId || "none"}
        onValueChange={handleProductChange}
      >
        <SelectTrigger className="w-48" aria-label="Select product for this step">
          <SelectValue placeholder="Select product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No product</span>
          </SelectItem>
          {products.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              {product.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(step.id)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Delete step</span>
      </Button>
    </article>
  )
}

interface AddStepButtonProps {
  onAdd: () => void
  className?: string
}

export function AddStepButton({ onAdd, className }: AddStepButtonProps) {
  return (
    <button
      type="button"
      aria-label="Add step to routine"
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary",
        className
      )}
      onClick={onAdd}
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add Step
    </button>
  )
}
