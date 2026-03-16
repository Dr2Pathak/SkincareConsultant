import { notFound } from "next/navigation"
import Link from "next/link"
import { getProductById as getProductServer, getCompatibilityServer } from "@/lib/data-server"
import { getProductById as getProductMock, getCompatibilityResult } from "@/lib/mock-data"
import { Disclaimer } from "@/components/disclaimer"
import { VerdictCard } from "@/components/compatibility/verdict-badge"
import { ExpandableExplanation } from "@/components/compatibility/expandable-explanation"
import { IngredientHighlightList } from "@/components/compatibility/ingredient-highlight-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true"
  const product = useMock ? getProductMock(id) ?? null : await getProductServer(id)
  if (product == null) notFound()

  const compatibility = useMock ? getCompatibilityResult(id) : await getCompatibilityServer(id)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/product-check"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Product Check
        </Link>
      </div>

      <article className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          <p className="text-muted-foreground">{product.brand}</p>
          {product.category && (
            <Badge variant="secondary" className="mt-2">
              {product.category}
            </Badge>
          )}
        </header>

        {product.description && (
          <p className="text-muted-foreground leading-relaxed">{product.description}</p>
        )}

        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="text-lg font-semibold text-foreground mb-2">
            Ingredients (INCI)
          </h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {product.inciList.map((ing) => (
              <li key={ing}>{ing}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="compatibility-heading">
          <h2 id="compatibility-heading" className="text-lg font-semibold text-foreground mb-3">
            Compatibility with your profile
          </h2>
          <VerdictCard
            verdict={compatibility.verdict}
            score={compatibility.score}
            scoreLabel={compatibility.scoreLabel}
            summary={compatibility.summary}
          />
          {(compatibility.reasons.length > 0 || compatibility.dimensions) && (
            <ExpandableExplanation
              dimensions={compatibility.dimensions ?? {}}
              reasons={compatibility.reasons}
              className="mt-3"
            />
          )}
          {compatibility.ingredientNotes && compatibility.ingredientNotes.length > 0 && (
            <IngredientHighlightList
              notes={compatibility.ingredientNotes}
              className="mt-3"
            />
          )}
        </section>

        <Disclaimer className="text-xs">
          Compatibility is for guidance only. Patch test new products and consult a professional for medical advice.
        </Disclaimer>

        <div className="pt-4">
          <Button asChild variant="outline">
            <Link href="/product-check">Check another product</Link>
          </Button>
        </div>
      </article>
    </div>
  )
}
