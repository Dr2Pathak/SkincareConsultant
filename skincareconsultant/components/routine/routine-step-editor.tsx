"use client"

import { GripVertical, Trash2, Plus, Edit2, Check, X } from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
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

const SEARCH_DEBOUNCE_MS = 250
const MIN_SEARCH_LEN = 2

interface RoutineStepEditorProps {
  step: RoutineStep
  products: Product[]
  onUpdate: (step: RoutineStep) => void
  onDelete: (stepId: string) => void
  searchProducts?: (query: string) => Promise<Product[]>
  className?: string
}

export function RoutineStepEditor({
  step,
  products,
  onUpdate,
  onDelete,
  searchProducts: searchProductsFn,
  className,
}: RoutineStepEditorProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editedLabel, setEditedLabel] = useState(step.label)
  const [productSearch, setProductSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const runSearch = useCallback(
    async (q: string) => {
      if (!searchProductsFn || q.trim().length < MIN_SEARCH_LEN) {
        if (mountedRef.current) setSearchResults([])
        return
      }
      if (mountedRef.current) setSearching(true)
      try {
        const results = await searchProductsFn(q.trim())
        if (!mountedRef.current) return
        setSearchResults(results)
        setSearchOpen(true)
      } finally {
        if (mountedRef.current) setSearching(false)
      }
    },
    [searchProductsFn]
  )

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      if (cancelled) return
      runSearch(productSearch)
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [productSearch, runSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

  const useProductSearch = products.length === 0 && !!searchProductsFn

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

      {useProductSearch ? (
        <div className="relative w-56" ref={searchRef}>
          <Input
            placeholder="Search product..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            onFocus={() => productSearch.trim().length >= MIN_SEARCH_LEN && setSearchOpen(true)}
            className="h-8"
            aria-label="Search product for this step"
          />
          {searching && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Searching...</span>
          )}
          {searchOpen && (searchResults.length > 0 || (productSearch.trim().length >= MIN_SEARCH_LEN && !searching)) && (
            <ul
              className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
              role="listbox"
            >
              <li
                role="option"
                className="cursor-pointer px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onUpdate({ ...step, productId: undefined, product: undefined })
                  setProductSearch("")
                  setSearchOpen(false)
                }}
              >
                No product
              </li>
              {searchResults.slice(0, 8).map((product) => (
                <li
                  key={product.id}
                  role="option"
                  className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onUpdate({ ...step, productId: product.id, product })
                    setProductSearch("")
                    setSearchResults([])
                    setSearchOpen(false)
                  }}
                >
                  {product.name} — {product.brand}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
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
      )}

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
