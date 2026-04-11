/**
 * GET /api/ingredients/suggest?q= — distinct INCI substrings from the product catalog (autocomplete).
 * Uses RPC ingredient_suggest (see scripts/migrations/ingredient-suggest-rpc.sql).
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim() ?? ""
    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] as string[] })
    }
    const safe = q.slice(0, 120)

    const supabase = getSupabaseServer()
    const { data, error } = await supabase.rpc("ingredient_suggest", { search_term: safe })

    if (error) {
      console.error("ingredient_suggest RPC failed", { error: error.message, q: safe.slice(0, 40) })
      if (error.message.includes("function") && error.message.includes("does not exist")) {
        return NextResponse.json({ suggestions: [] as string[] })
      }
      return NextResponse.json({ error: "Suggest failed" }, { status: 500 })
    }

    const rows = (data ?? []) as { ingredient?: string }[]
    const suggestions = rows
      .map((r) => (typeof r.ingredient === "string" ? r.ingredient.trim() : ""))
      .filter(Boolean)

    return NextResponse.json({ suggestions })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/ingredients/suggest failed", { error: message })
    return NextResponse.json({ error: "Suggest failed" }, { status: 500 })
  }
}
