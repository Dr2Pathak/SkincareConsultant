/**
 * GET /api/routine-insights — knowledge graph insights (conflicts & helps) for the authenticated user's routine.
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getRoutineKnowledgeInsights } from "@/lib/routine-knowledge"
import type { RoutineInsights } from "@/lib/types"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    const supabase = getSupabaseServer()
    let productIds: string[] = []

    if (user) {
      const { data: current } = await supabase
        .from("routines")
        .select("am, pm")
        .eq("user_id", user.id)
        .eq("is_current", true)
        .maybeSingle()
      let row = current
      if (!row) {
        const { data: latest } = await supabase
          .from("routines")
          .select("am, pm")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        row = latest
      }
      const am = Array.isArray(row?.am) ? row.am : []
      const pm = Array.isArray(row?.pm) ? row.pm : []
      const steps = [...am, ...pm] as Array<{ productId?: string }>
      productIds = steps.map((s) => s.productId).filter((id): id is string => !!id)
    }

    const insights = await getRoutineKnowledgeInsights(productIds)
    const result: RoutineInsights = {
      conflicts: insights?.conflicts ?? [],
      helps: insights?.helps ?? [],
      hasRoutineProducts: productIds.length > 0,
    }
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/routine-insights failed", { error: message })
    return NextResponse.json(
      { error: "Failed to load routine insights" },
      { status: 500 }
    )
  }
}
