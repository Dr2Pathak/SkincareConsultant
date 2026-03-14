import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
  variant?: "compact" | "full"
  showActions?: boolean
  onAddToRoutine?: (product: Product) => void
  onCheckCompatibility?: (product: Product) => void
  className?: string
}

export function ProductCard({
  product,
  variant = "compact",
  showActions = false,
  onAddToRoutine,
  onCheckCompatibility,
  className,
}: ProductCardProps) {
  if (variant === "compact") {
    return (
      <article
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50",
          className
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
          {product.brand.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-foreground">{product.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{product.brand}</p>
        </div>
        {product.category && (
          <Badge variant="secondary" className="shrink-0">
            {product.category}
          </Badge>
        )}
      </article>
    )
  }

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
          {product.brand.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{product.brand}</p>
          {product.category && (
            <Badge variant="secondary" className="mt-2">
              {product.category}
            </Badge>
          )}
        </div>
      </div>

      {product.description && (
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          {product.description}
        </p>
      )}

      {product.inciList.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Key Ingredients
          </h4>
          <p className="text-sm text-foreground">
            {product.inciList.slice(0, 5).join(", ")}
            {product.inciList.length > 5 && (
              <span className="text-muted-foreground"> +{product.inciList.length - 5} more</span>
            )}
          </p>
        </div>
      )}

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {onCheckCompatibility && (
            <Button size="sm" onClick={() => onCheckCompatibility(product)}>
              Check Compatibility
            </Button>
          )}
          {onAddToRoutine && (
            <Button size="sm" variant="outline" onClick={() => onAddToRoutine(product)}>
              Add to Routine
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/product/${product.id}`}>
              View Details
              <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </article>
  )
}
