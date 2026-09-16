"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, RotateCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"
import { VerdictCard } from "@/components/compatibility/verdict-badge"
import { ExpandableExplanation } from "@/components/compatibility/expandable-explanation"
import { IngredientHighlightList } from "@/components/compatibility/ingredient-highlight-list"
import { Disclaimer } from "@/components/disclaimer"
import { searchProducts, getCompatibility } from "@/lib/data"
import type { Product, CompatibilityResult } from "@/lib/types"

const DEBOUNCE_MS = 280
const MIN_QUERY_LENGTH = 2

export default function ProductCheckPage() {
  const [query, setQuery] = useState("")
  const [dropdownResults, setDropdownResults] = useState<Product[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < MIN_QUERY_LENGTH) {
      setDropdownResults([])
      return
    }
    setIsSearching(true)
    try {
      const results = await searchProducts(q.trim())
      setDropdownResults(results)
      setDropdownOpen(true)
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      runSearch(query)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query, runSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleCheckProduct = async (product: Product) => {
    setSelectedProduct(product)
    setCompatibilityResult(null)
    setDropdownOpen(false)
    setDropdownResults([])
    setQuery("")
    try {
      const result = await getCompatibility(product.id)
      setCompatibilityResult(result)
    } catch {
      setCompatibilityResult(null)
    }
  }

  const handleReset = () => {
    setSelectedProduct(null)
    setCompatibilityResult(null)
    setQuery("")
    setDropdownResults([])
    setDropdownOpen(false)
  }

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-left sm:text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Product Check</h1>
          <div className="barrier-rule mt-3 sm:mx-auto" aria-hidden="true" />
          <p className="mt-4 text-muted-foreground max-w-2xl sm:mx-auto leading-relaxed">
            Search for a product to see how well it fits with your skin profile and existing routine.
          </p>
        </div>

        {!compatibilityResult && (
          <>
            <div className="mb-6 surface-panel p-4 sm:p-5" ref={containerRef}>
              <div className="relative max-w-xl sm:mx-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
                <Input
                  type="search"
                  placeholder="Type product name, brand, or ingredient (e.g. niaci, CeraVe)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => query.trim().length >= MIN_QUERY_LENGTH && dropdownResults.length > 0 && setDropdownOpen(true)}
                  className="pl-9"
                  aria-label="Search products"
                  aria-expanded={dropdownOpen}
                  aria-autocomplete="list"
                  aria-controls="product-dropdown"
                  id="product-search"
                />
                {isSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Searching...</span>
                )}
                {dropdownOpen && (dropdownResults.length > 0 || (query.trim().length >= MIN_QUERY_LENGTH && !isSearching)) && (
                  <ul
                    id="product-dropdown"
                    role="listbox"
                    className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
                  >
                    {dropdownResults.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-muted-foreground">No products found</li>
                    ) : (
                      dropdownResults.slice(0, 12).map((product) => (
                        <li
                          key={product.id}
                          role="option"
                          tabIndex={0}
                          className="cursor-pointer px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleCheckProduct(product)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              handleCheckProduct(product)
                            }
                          }}
                        >
                          <span className="font-medium text-foreground">{product.name}</span>
                          <span className="text-muted-foreground"> — {product.brand}</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Start typing to see suggestions; select a product to check compatibility.
              </p>
            </div>

            {!query && !selectedProduct && (
              <div className="text-center py-14 surface-panel border-dashed">
                <h3 className="font-display text-xl font-semibold text-foreground">Search for a product</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Type a product name, brand, or ingredient (e.g. niacinamide, CeraVe) to see matching products, then select one to check compatibility.
                </p>
              </div>
            )}
          </>
        )}

        {/* Compatibility Result */}
        {compatibilityResult && selectedProduct && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Check Another Product
              </Button>
            </div>

            {/* Product being checked */}
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Checking Product
              </p>
              <ProductCard product={selectedProduct} variant="compact" />
            </div>

            {/* Verdict Card */}
            <VerdictCard
              verdict={compatibilityResult.verdict}
              score={compatibilityResult.score}
              scoreLabel={compatibilityResult.scoreLabel}
              summary={compatibilityResult.summary}
            />

            {/* Disclaimer */}
            <Disclaimer>
              For guidance only; not medical advice. Patch test when trying new products.
            </Disclaimer>

            {/* Expandable Analysis */}
            {compatibilityResult.dimensions && (
              <ExpandableExplanation
                dimensions={compatibilityResult.dimensions}
                reasons={compatibilityResult.reasons}
              />
            )}

            {/* Ingredient Notes */}
            {compatibilityResult.ingredientNotes && compatibilityResult.ingredientNotes.length > 0 && (
              <IngredientHighlightList notes={compatibilityResult.ingredientNotes} />
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row pt-4 border-t border-border">
              <Button variant="outline" className="flex-1" asChild>
                <a href={`/product/${selectedProduct.id}`}>View Full Product Details</a>
              </Button>
              <Button className="flex-1" asChild>
                <a href={`/routine?addProduct=${encodeURIComponent(selectedProduct.id)}`}>Add to Routine</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
