"use client"

import { useState } from "react"
import { Search, ArrowRight, RotateCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/product-card"
import { VerdictCard } from "@/components/compatibility/verdict-badge"
import { ExpandableExplanation } from "@/components/compatibility/expandable-explanation"
import { IngredientHighlightList } from "@/components/compatibility/ingredient-highlight-list"
import { Disclaimer } from "@/components/disclaimer"
import { searchProducts, getCompatibilityResult } from "@/lib/mock-data"
import type { Product, CompatibilityResult } from "@/lib/types"

export default function ProductCheckPage() {
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = () => {
    if (!query.trim()) return
    setIsSearching(true)
    // Simulate search delay
    setTimeout(() => {
      setSearchResults(searchProducts(query))
      setIsSearching(false)
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleCheckProduct = (product: Product) => {
    setSelectedProduct(product)
    const result = getCompatibilityResult(product.id)
    setCompatibilityResult(result)
    setSearchResults([])
    setQuery("")
  }

  const handleReset = () => {
    setSelectedProduct(null)
    setCompatibilityResult(null)
    setQuery("")
    setSearchResults([])
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Product Compatibility Check</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
            Search for a product to see how well it fits with your skin profile and existing routine.
          </p>
        </div>

        {/* Show search when no result is displayed */}
        {!compatibilityResult && (
          <>
            <div className="mb-8">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    type="search"
                    placeholder="Search by product name, brand, or ingredient..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-9"
                    aria-label="Search products"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <section aria-label="Search results">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Search Results ({searchResults.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {searchResults.map((product) => (
                    <div key={product.id} className="relative">
                      <ProductCard product={product} variant="full" />
                      <Button
                        className="mt-3 w-full"
                        onClick={() => handleCheckProduct(product)}
                      >
                        Check Compatibility
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {query && searchResults.length === 0 && !isSearching && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found matching "{query}"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try searching for "CeraVe", "The Ordinary", or "Niacinamide"
                </p>
              </div>
            )}

            {!query && searchResults.length === 0 && (
              <div className="text-center py-12 rounded-xl border border-dashed border-border">
                <Search className="mx-auto h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-medium text-foreground">Search for a Product</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                  Enter a product name, brand, or ingredient to check its compatibility with your routine.
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
                <a href="/routine">Add to Routine</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
