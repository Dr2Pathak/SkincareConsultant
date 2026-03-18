import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getNeo4jDriver } from "@/lib/neo4j"
import { getRoutineKnowledgeInsights } from "@/lib/routine-knowledge"
import { buildRoutineSchedule } from "@/lib/routine-schedule"
import type { Routine, RoutineHealth, RoutineInsights, SavedRoutineSummary } from "@/lib/types"
import type { RoutineScheduleEvent } from "@/lib/routine-schedule"

const DEFAULT_NAME = "My routine"

type RoutineBootstrap = {
  routine: Routine
  health: RoutineHealth
  insights: RoutineInsights
  savedRoutines: SavedRoutineSummary[]
  scheduleEvents: RoutineScheduleEvent[]
}

function emptyHealth(): RoutineHealth {
  return {
    score: 100,
    warnings: [],
    exfoliationLoad: 0,
    retinoidStrength: 0,
    conflictCount: 0,
  }
}

function routineFromRow(row: { id?: string; name?: string; am?: unknown[]; pm?: unknown[] } | null): Routine {
  return {
    id: row?.id,
    name: row?.name ?? DEFAULT_NAME,
    am: (Array.isArray(row?.am) ? row?.am : []) as Routine["am"],
    pm: (Array.isArray(row?.pm) ? row?.pm : []) as Routine["pm"],
  }
}

function routineProductIdsFromSteps(steps: Routine["am"] | Routine["pm"]): string[] {
  return (steps ?? []).map((s) => s.productId).filter((id): id is string => !!id)
}

async function loadCurrentOrLatestRoutine(supabase: ReturnType<typeof getSupabaseServer>, userId: string): Promise<Routine> {
  let row: { id?: string; name?: string; am?: unknown[]; pm?: unknown[] } | null = null

  const { data: current } = await supabase
    .from("routines")
    .select("id, name, am, pm")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle()
  row = current ?? null

  if (!row) {
    const { data: latest } = await supabase
      .from("routines")
      .select("id, name, am, pm")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    row = latest ?? null
  }

  if (!row) {
    return { name: DEFAULT_NAME, am: [], pm: [] }
  }
  return routineFromRow(row)
}

async function loadSavedRoutines(
  supabase: ReturnType<typeof getSupabaseServer>,
  userId: string,
): Promise<SavedRoutineSummary[]> {
  const { data: rows } = await supabase
    .from("routines")
    .select("id, name, am, pm, is_current, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (!rows || rows.length === 0) return []

  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? DEFAULT_NAME,
    am: Array.isArray(r.am) ? (r.am as SavedRoutineSummary["am"]) : [],
    pm: Array.isArray(r.pm) ? (r.pm as SavedRoutineSummary["pm"]) : [],
    is_current: Boolean(r.is_current),
    updated_at: r.updated_at,
  }))
}

async function computeRoutineHealth(supabase: ReturnType<typeof getSupabaseServer>, routine: Routine): Promise<RoutineHealth> {
  const productIds = [...routineProductIdsFromSteps(routine.am), ...routineProductIdsFromSteps(routine.pm)]
  const uniqueProductIds = Array.from(new Set(productIds))
  if (uniqueProductIds.length === 0) return emptyHealth()

  const { data: products } = await supabase
    .from("products")
    .select("id, inci_list")
    .in("id", uniqueProductIds)

  const allInci = (products ?? []).flatMap((p) => (p.inci_list as string[]) ?? [])
  const lowerInci = allInci.map((i) => i.toLowerCase())

  let exfoliationLoad = 0
  let retinoidStrength = 0
  const warnings: RoutineHealth["warnings"] = []

  if (lowerInci.some((i) => i.includes("glycolic") || i.includes("lactic") || i.includes("aha"))) exfoliationLoad += 1
  if (lowerInci.some((i) => i.includes("salicylic") || i.includes("bha"))) exfoliationLoad += 1
  if (lowerInci.some((i) => i.includes("retinol") || i.includes("retinoid"))) retinoidStrength += 1

  let conflictCount = 0

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

  // Knowledge-graph based conflict count (Neo4j)
  try {
    const driver = getNeo4jDriver()
    const session = driver.session()
    try {
      const ids = [
        ...new Set(
          allInci.map((i) =>
            i
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, ""),
          ),
        ),
      ]

      if (ids.length > 0) {
        const res = await session.run(
          "MATCH (a)-[:CONFLICTS_WITH]->(b) WHERE a.id IN $ids AND b.id IN $ids RETURN count(*) AS c",
          { ids },
        )
        conflictCount = Number(res.records[0]?.get("c") ?? 0)
      }
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
    console.warn("Neo4j routine-bootstrap health skipped", { error: msg })
  }

  const score = Math.max(0, 100 - warnings.length * 15 - conflictCount * 10)
  return {
    score,
    warnings,
    exfoliationLoad,
    retinoidStrength,
    conflictCount,
  }
}

async function computeRoutineInsights(routine: Routine): Promise<RoutineInsights> {
  const productIds = [...routineProductIdsFromSteps(routine.am), ...routineProductIdsFromSteps(routine.pm)]
  const uniqueProductIds = Array.from(new Set(productIds))
  const insights = await getRoutineKnowledgeInsights(uniqueProductIds)
  return {
    conflicts: insights?.conflicts ?? [],
    helps: insights?.helps ?? [],
    hasRoutineProducts: uniqueProductIds.length > 0,
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      const result: RoutineBootstrap = {
        routine: { name: DEFAULT_NAME, am: [], pm: [] },
        health: emptyHealth(),
        insights: { conflicts: [], helps: [], hasRoutineProducts: false },
        savedRoutines: [],
        scheduleEvents: [],
      }
      return NextResponse.json(result)
    }

    const supabase = getSupabaseServer()

    const [routine, savedRoutines] = await Promise.all([
      loadCurrentOrLatestRoutine(supabase, user.id),
      loadSavedRoutines(supabase, user.id),
    ])

    const [health, insights] = await Promise.all([
      computeRoutineHealth(supabase, routine),
      computeRoutineInsights(routine),
    ])

    const scheduleEvents = buildRoutineSchedule(
      routine,
      {},
      { includeAm: true, includePm: true, includeWeekly: false },
      { horizonDays: 30 },
    )

    const result: RoutineBootstrap = {
      routine,
      health,
      insights,
      savedRoutines,
      scheduleEvents,
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/routine-bootstrap failed", { error: message })
    return NextResponse.json({ error: "Failed to load routine" }, { status: 500 })
  }
}

