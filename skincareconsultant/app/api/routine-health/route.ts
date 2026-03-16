/**
 * GET /api/routine-health — compute routine health from the authenticated user's routine + Neo4j graph.
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getNeo4jDriver } from "@/lib/neo4j"
import type { RoutineHealth, RoutineHealthWarning } from "@/lib/types"

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    const supabase = getSupabaseServer()
    let am: unknown[] = []
    let pm: unknown[] = []
    if (user) {
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
      am = Array.isArray(routineRow?.am) ? routineRow.am : []
      pm = Array.isArray(routineRow?.pm) ? routineRow.pm : []
    }
    const steps = [...am, ...pm] as Array<{ productId?: string }>
    const productIds = steps.map((s) => s.productId).filter(Boolean) as string[]

    let exfoliationLoad = 0
    let retinoidStrength = 0
    let conflictCount = 0
    const warnings: RoutineHealthWarning[] = []

    if (productIds.length === 0) {
      return NextResponse.json({
        score: 100,
        warnings: [],
        exfoliationLoad: 0,
        retinoidStrength: 0,
        conflictCount: 0,
      } satisfies RoutineHealth)
    }

    const { data: products } = await supabase.from("products").select("id, inci_list").in("id", productIds)
    const allInci = (products ?? []).flatMap((p) => (p.inci_list as string[]) ?? [])

    const lowerInci = allInci.map((i) => i.toLowerCase())
    if (lowerInci.some((i) => i.includes("glycolic") || i.includes("lactic") || i.includes("aha"))) exfoliationLoad += 1
    if (lowerInci.some((i) => i.includes("salicylic") || i.includes("bha"))) exfoliationLoad += 1
    if (lowerInci.some((i) => i.includes("retinol") || i.includes("retinoid"))) retinoidStrength += 1

    if (exfoliationLoad >= 2) {
      warnings.push({
        type: "exfoliation",
        severity: "warning",
        message: "Multiple exfoliants in routine",
        details: "Using AHA and BHA together can increase irritation. Consider alternating.",
      })
    }
    if (retinoidStrength > 0 && exfoliationLoad > 0) {
      warnings.push({
        type: "conflict",
        severity: "warning",
        message: "Retinoid with exfoliants",
        details: "Using retinoids with AHAs/BHAs may cause irritation. Consider using on different days.",
      })
    }

    try {
      const driver = getNeo4jDriver()
      const session = driver.session()
      try {
        const ids = [...new Set(allInci.map((i) => i.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")))]
        const res = await session.run(
          "MATCH (a)-[:CONFLICTS_WITH]->(b) WHERE a.id IN $ids AND b.id IN $ids RETURN count(*) AS c",
          { ids }
        )
        conflictCount = Number(res.records[0]?.get("c") ?? 0)
        if (conflictCount > 0) {
          warnings.push({
            type: "conflict",
            severity: "danger",
            message: "Potential ingredient conflicts in your routine",
            details: "Some ingredients may counteract or irritate when used together.",
          })
        }
      } finally {
        await session.close()
      }
    } catch (neoErr) {
      const msg = neoErr instanceof Error ? neoErr.message : "Unknown error"
      console.warn("Neo4j routine-health skipped", { error: msg })
    }

    const score = Math.max(0, 100 - warnings.length * 15 - conflictCount * 10)
    const result: RoutineHealth = {
      score,
      warnings,
      exfoliationLoad,
      retinoidStrength,
      conflictCount,
    }
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/routine-health failed", { error: message })
    return NextResponse.json(
      { error: "Failed to compute routine health" },
      { status: 500 }
    )
  }
}
