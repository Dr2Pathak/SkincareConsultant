/**
 * GET /api/routine-ingredient-ids
 *
 * Returns normalized ingredient ids derived from the authenticated user's current routine.
 * Used to avoid N+1 product lookups on the client when the user switches to "My routine"
 * in the ingredients graph page.
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"

function normalizeInciId(inci: string): string {
  return inci.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ ingredientIds: [] as string[] })
    }

    const supabase = getSupabaseServer()

    // Load current routine or fall back to latest.
    const { data: current } = await supabase
      .from("routines")
      .select("am, pm")
      .eq("user_id", user.id)
      .eq("is_current", true)
      .maybeSingle()

    let routineRow = current
    if (!routineRow) {
      const { data: latest } = await supabase
        .from("routines")
        .select("am, pm")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      routineRow = latest
    }
    const steps = [
      ...(Array.isArray(routineRow?.am) ? routineRow.am : []),
      ...(Array.isArray(routineRow?.pm) ? routineRow.pm : []),
    ] as Array<{ productId?: string }>

    const productIds = steps.map((s) => s.productId).filter((id): id is string => !!id)

    if (productIds.length === 0) {
      return NextResponse.json({ ingredientIds: [] as string[] })
    }

    const { data: products } = await supabase
      .from("products")
      .select("id, inci_list")
      .in("id", productIds)

    const ids = new Set<string>()
    for (const p of products ?? []) {
      const inciList = Array.isArray((p as { inci_list?: unknown }).inci_list) ? (p as { inci_list: string[] }).inci_list : []
      for (const inci of inciList) {
        ids.add(normalizeInciId(inci))
      }
    }

    return NextResponse.json({ ingredientIds: Array.from(ids) })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/routine-ingredient-ids failed", { error: message })
    return NextResponse.json({ error: "Failed to load routine ingredients" }, { status: 500 })
  }
}

