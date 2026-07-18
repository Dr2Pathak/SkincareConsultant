/**
 * GET /api/compatibility?productId= — rule-based compatibility using profile, product INCI, and Neo4j graph.
 * Uses authenticated user's profile when available; otherwise no avoid list.
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getNeo4jDriver } from "@/lib/neo4j"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { embedTexts } from "@/lib/gemini"
import type { CompatibilityResult, CompatibilityDimension, IngredientNote } from "@/lib/types"
import type { RagMetadata } from "@/lib/rag-types"
import { resolveInciListToNodeIds } from "@/lib/inci-resolver"
import { withSpan } from "@/lib/telemetry/tracing"

export async function GET(request: Request) {
  return withSpan("compatibility.request", { route: "/api/compatibility" }, async (rootSpan) => {
  const productId = new URL(request.url).searchParams.get("productId")
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 })
  }

  rootSpan.setAttribute("product.id", productId)

  try {
    const supabase = getSupabaseServer()
    const { data: productRow } = await supabase
      .from("products")
      .select("id, name, inci_list")
      .eq("id", productId)
      .maybeSingle()
    if (!productRow) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const inciList = Array.isArray(productRow.inci_list) ? (productRow.inci_list as string[]) : []
    const user = await getUserFromRequest(request)
    let avoidList: string[] = []
    let profileConcerns: string[] = []
    let profileSkinTypes: string[] = []
    let profileTolerance: string | undefined
    if (user) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("skin_types, concerns, avoid_list, tolerance")
        .eq("id", user.id)
        .maybeSingle()
      avoidList = (profileRow?.avoid_list ?? []) as string[]
      profileConcerns = (profileRow?.concerns ?? []) as string[]
      profileSkinTypes = (profileRow?.skin_types ?? []) as string[]
      profileTolerance = (profileRow?.tolerance as string | undefined) ?? undefined
    }

    const reasons: string[] = []
    const ingredientNotes: IngredientNote[] = []
    let verdict: CompatibilityResult["verdict"] = "ready"
    let score = 80
    let scoreLabel = "Good fit"
    let goalAlignmentDimension: CompatibilityDimension | undefined

    for (const ing of inciList) {
      const lower = ing.toLowerCase()
      const avoided = avoidList.some((a) => {
        const aLower = a.toLowerCase()
        return lower.includes(aLower) || aLower.includes(lower)
      })
      if (avoided) {
        verdict = "not_recommended"
        score = Math.min(score, 30)
        scoreLabel = "Not recommended"
        reasons.push(`Contains an ingredient you avoid: ${ing}`)
        ingredientNotes.push({ ingredientName: ing, note: "In your avoid list", type: "danger" })
      }
    }

    let conflictCount = 0
    try {
      conflictCount = await withSpan("compatibility.neo4j.conflicts", { productId }, async (neoSpan) => {
      const driver = getNeo4jDriver()
      const session = driver.session()
      try {
        const ids = resolveInciListToNodeIds(inciList)
        if (ids.length === 0) {
          // No resolvable ingredients; skip graph lookup but still return avoid-list result.
          throw new Error("No resolvable INCI ids for graph lookup")
        }
        neoSpan.setAttribute("neo4j.ingredient_ids", ids.length)
        const res = await session.run(
          "MATCH (a)-[r:CONFLICTS_WITH]->(b) WHERE a.id IN $ids OR b.id IN $ids RETURN a.id, b.id",
          { ids }
        )
        const count = res.records.length
        neoSpan.setAttribute("neo4j.conflict_count", count)
        return count
      } finally {
        await session.close()
      }
      })
      if (conflictCount > 0) {
        if (verdict !== "not_recommended") verdict = "patch_test"
        score = Math.min(score, 60)
        scoreLabel = "Patch test recommended"
        reasons.push("Some ingredients may conflict with others in your routine or this product.")
      }
    } catch (neoErr) {
      const msg = neoErr instanceof Error ? neoErr.message : "Unknown error"
      console.warn("Neo4j compatibility check skipped", { productId, error: msg })
    }

    // RAG-based goal alignment (best-effort; does not override safety rules)
    try {
      if (profileConcerns.length > 0 || profileSkinTypes.length > 0) {
        await withSpan("compatibility.rag.goal_alignment", { productId }, async (ragSpan) => {
        const pc = getPineconeClient()
        const host = getPineconeIndexHost()
        const index = pc.index({ host })

        const profileTextParts: string[] = []
        if (profileConcerns.length > 0) {
          profileTextParts.push(`concerns: ${profileConcerns.join(", ")}`)
        }
        if (profileSkinTypes.length > 0) {
          profileTextParts.push(`skin types: ${profileSkinTypes.join(", ")}`)
        }
        if (profileTolerance) {
          profileTextParts.push(`tolerance: ${profileTolerance}`)
        }

        const profileText = profileTextParts.join(" | ")
        const productText = `${productRow.name}; ingredients: ${inciList.slice(0, 15).join(", ")}`
        const query = `skincare product goal alignment. Profile: ${profileText}. Product: ${productText}.`

        const [embedding] = await withSpan("compatibility.embed", {}, () => embedTexts([query]))
        ragSpan.setAttribute("embed.dimensions", embedding.length)
        const result = await withSpan("compatibility.pinecone.query", {}, () =>
          index.query({
            vector: embedding,
            topK: 6,
            includeMetadata: true,
          }),
        )
        const matches =
          (result as { matches?: Array<{ score?: number; metadata?: RagMetadata }> }).matches ?? []
        ragSpan.setAttribute("pinecone.match_count", matches.length)
        if (matches.length > 0) {
          const scores = matches
            .map((m) => (typeof m.score === "number" ? m.score : 0))
            .filter((s) => s > 0)
          if (scores.length > 0) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length
            ragSpan.setAttribute("pinecone.avg_score", Math.round(avg * 1000) / 1000)
            const concernsText =
              profileConcerns.length > 0 ? profileConcerns.join(", ") : "your goals"
            if (avg >= 0.35) {
              goalAlignmentDimension = {
                label: "Goal alignment",
                status: "good",
                description: `RAG context suggests this product is a reasonably good match for ${concernsText}.`,
              }
              reasons.push(
                "RAG similarity suggests this product aligns with your stated skincare goals."
              )
            } else if (avg > 0) {
              goalAlignmentDimension = {
                label: "Goal alignment",
                status: "warning",
                description: `RAG context does not strongly match this product to ${concernsText}. Consider if it truly fits your priorities.`,
              }
            }
          }
        }
        })
      }
    } catch (ragErr) {
      const msg = ragErr instanceof Error ? ragErr.message : "Unknown error"
      console.warn("Compatibility goalAlignment RAG step skipped", { productId, error: msg })
    }

    const result: CompatibilityResult = {
      verdict,
      score,
      scoreLabel,
      summary:
        verdict === "not_recommended"
          ? "This product is not recommended for your profile."
          : verdict === "patch_test"
            ? "Consider patch testing. Some ingredients may interact."
            : "This product looks compatible with your profile. Always patch test new products.",
      dimensions: goalAlignmentDimension ? { goalAlignment: goalAlignmentDimension } : undefined,
      reasons,
      ingredientNotes: ingredientNotes.length > 0 ? ingredientNotes : undefined,
    }
    rootSpan.setAttribute("compatibility.verdict", verdict)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/compatibility failed", { productId, error: message })
    return NextResponse.json(
      { error: "Compatibility check failed" },
      { status: 500 }
    )
  }
  })
}
