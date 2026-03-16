/**
 * Server-only data access for RSC. Use in server components to avoid fetch() relative URL errors.
 * Do not import this from client components.
 */

import "server-only"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getNeo4jDriver } from "@/lib/neo4j"
import type { Product, CompatibilityResult, IngredientNote } from "@/lib/types"

function rowToProduct(row: {
  id: string
  name: string
  brand: string
  inci_list: string[] | unknown
  category?: string | null
  description?: string | null
}): Product {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    inciList: Array.isArray(row.inci_list) ? row.inci_list : [],
    category: row.category ?? undefined,
    description: row.description ?? undefined,
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = getSupabaseServer()
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle()
  if (error || !data) return null
  return rowToProduct(data)
}

export async function getCompatibilityServer(productId: string): Promise<CompatibilityResult> {
  const supabase = getSupabaseServer()
  const { data: productRow } = await supabase
    .from("products")
    .select("id, name, inci_list")
    .eq("id", productId)
    .maybeSingle()
  if (!productRow) {
    return {
      verdict: "not_recommended",
      score: 0,
      scoreLabel: "Unknown",
      summary: "Product not found.",
      reasons: [],
    }
  }

  const inciList = Array.isArray(productRow.inci_list) ? (productRow.inci_list as string[]) : []
  const { data: profileRow } = await supabase.from("profiles").select("avoid_list").limit(1).maybeSingle()
  const avoidList: string[] = (profileRow?.avoid_list ?? []) as string[]

  const reasons: string[] = []
  const ingredientNotes: IngredientNote[] = []
  let verdict: CompatibilityResult["verdict"] = "ready"
  let score = 80
  let scoreLabel = "Good fit"

  for (const ing of inciList) {
    const lower = ing.toLowerCase()
    const avoided = avoidList.some((a) => lower.includes(a.toLowerCase()))
    if (avoided) {
      verdict = "not_recommended"
      score = Math.min(score, 30)
      scoreLabel = "Not recommended"
      reasons.push(`Contains an ingredient you avoid: ${ing}`)
      ingredientNotes.push({ ingredientName: ing, note: "In your avoid list", type: "danger" })
    }
  }

  try {
    const driver = getNeo4jDriver()
    const session = driver.session()
    try {
      const res = await session.run(
        "MATCH (a)-[r:CONFLICTS_WITH]->(b) WHERE a.id IN $ids OR b.id IN $ids RETURN a.id, b.id",
        { ids: inciList.map((i) => i.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) }
      )
      if (res.records.length > 0) {
        if (verdict !== "not_recommended") verdict = "patch_test"
        score = Math.min(score, 60)
        scoreLabel = "Patch test recommended"
        reasons.push("Some ingredients may conflict with others in your routine or this product.")
      }
    } finally {
      await session.close()
    }
  } catch (neoErr) {
    const msg = neoErr instanceof Error ? neoErr.message : "Unknown error"
    console.warn("Neo4j compatibility check skipped", { productId, error: msg })
  }

  return {
    verdict,
    score,
    scoreLabel,
    summary:
      verdict === "not_recommended"
        ? "This product is not recommended for your profile."
        : verdict === "patch_test"
          ? "Consider patch testing. Some ingredients may interact."
          : "This product looks compatible with your profile. Always patch test new products.",
    reasons,
    ingredientNotes: ingredientNotes.length > 0 ? ingredientNotes : undefined,
  }
}
