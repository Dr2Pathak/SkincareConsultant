"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Product } from "@/lib/types"

const SEARCH_DEBOUNCE_MS = 250
const MIN_SEARCH_LEN = 2

export type AddToRoutinePart = "am" | "pm"

interface AddProductDialogProps {
  open: boolean
  onClose: () => void
  /** When set, show this product and skip search (e.g. from product-check link). */
  initialProductId: string | null
  /** Fetch product by id (e.g. from URL param). */
  getProduct: (id: string) => Promise<Product | undefined | null>
  /** Search products for picker. */
  searchProducts: (query: string) => Promise<Product[]>
  onAdd: (product: Product, part: AddToRoutinePart) => void
}

export function AddProductDialog({
  open,
  onClose,
  initialProductId,
  getProduct,
  searchProducts,
  onAdd,
}: AddProductDialogProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Load initial product when dialog opens with initialProductId
  useEffect(() => {
    if (!open || !initialProductId) {
      setProduct(null)
      setLoadingInitial(false)
      return
    }
    let cancelled = false
    setLoadingInitial(true)
    getProduct(initialProductId).then((p) => {
      if (!cancelled && mountedRef.current) {
        setProduct(p ?? null)
      }
      if (mountedRef.current) setLoadingInitial(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, initialProductId, getProduct])

  const runSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < MIN_SEARCH_LEN) {
        if (mountedRef.current) setSearchResults([])
        return
      }
      if (mountedRef.current) setSearching(true)
      try {
        const results = await searchProducts(q.trim())
        if (mountedRef.current) setSearchResults(results)
      } finally {
        if (mountedRef.current) setSearching(false)
      }
    },
    [searchProducts]
  )

  useEffect(() => {
    if (!open || initialProductId) return
    const t = setTimeout(() => runSearch(searchQuery), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [open, initialProductId, searchQuery, runSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([])
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleAdd = (part: AddToRoutinePart) => {
    if (product) {
      onAdd(product, part)
      onClose()
      setProduct(null)
      setSearchQuery("")
      setSearchResults([])
    }
  }

  const handleClose = () => {
    setProduct(null)
    setSearchQuery("")
    setSearchResults([])
    onClose()
  }

  const showSearch = !initialProductId

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Add product to routine</DialogTitle>
          <DialogDescription>
            {showSearch
              ? "Search for a product, then choose Morning or Evening."
              : "Choose whether to add this product to your morning or evening routine."}
          </DialogDescription>
        </DialogHeader>

        {showSearch && (
          <div className="space-y-2" ref={searchRef}>
            <label htmlFor="add-product-search" className="text-sm font-medium text-foreground">
              Product
            </label>
            <Input
              id="add-product-search"
              placeholder="Search by name or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= MIN_SEARCH_LEN && setSearchResults(searchResults)}
              className="h-9"
              aria-autocomplete="list"
              aria-controls="add-product-results"
            />
            {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
            {searchResults.length > 0 && (
              <ul
                id="add-product-results"
                role="listbox"
                className="max-h-48 overflow-auto rounded-md border border-border bg-popover py-1"
              >
                {searchResults.slice(0, 8).map((p) => (
                  <li
                    key={p.id}
                    role="option"
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setProduct(p)
                      setSearchResults([])
                      setSearchQuery("")
                    }}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground"> — {p.brand}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {loadingInitial && <p className="text-sm text-muted-foreground">Loading product…</p>}

        {initialProductId && !loadingInitial && !product && (
          <p className="text-sm text-destructive">Product not found.</p>
        )}

        {product && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">{product.name}</span>
            <span className="text-muted-foreground"> — {product.brand}</span>
          </div>
        )}

        {product && (
          <>
            <p className="text-sm text-muted-foreground">Add to:</p>
            <DialogFooter className="flex-row gap-2 sm:justify-start">
              <Button type="button" variant="outline" onClick={() => handleAdd("am")} className="gap-2">
                <Sun className="h-4 w-4" aria-hidden="true" />
                Morning
              </Button>
              <Button type="button" variant="outline" onClick={() => handleAdd("pm")} className="gap-2">
                <Moon className="h-4 w-4" aria-hidden="true" />
                Evening
              </Button>
            </DialogFooter>
          </>
        )}

        {showSearch && !product && !loadingInitial && (
          <p className="text-xs text-muted-foreground">Type at least 2 characters to search, then select a product.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
