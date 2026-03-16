import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import type { RoutineStep } from "@/lib/types"
import { rowsToCsv, type HistoryCsvRow } from "@/lib/history-export"

function todayIso(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to export your routine history." },
        { status: 401 },
      )
    }

    const supabase = getSupabaseServer()
    const { data } = await supabase
      .from("routines")
      .select("id, name, am, pm")
      .eq("user_id", user.id)
      .eq("is_current", true)
      .maybeSingle()

    const rows: HistoryCsvRow[] = []
    const date = todayIso()

    if (data) {
      const amSteps = (Array.isArray(data.am) ? data.am : []) as RoutineStep[]
      const pmSteps = (Array.isArray(data.pm) ? data.pm : []) as RoutineStep[]
      const products = [...amSteps, ...pmSteps]
        .map((s) => s.product)
        .filter((p): p is NonNullable<RoutineStep["product"]> => Boolean(p))

      const productsInvolved =
        products.length > 0
          ? products
              .map((p) => `${p.brand ? `${p.brand} ` : ""}${p.name}`)
              .join("; ")
          : null

      rows.push({
        date,
        routineId: data.id,
        routineName: (data.name as string | null) ?? "My routine",
        changeType: "snapshot",
        changeSummary: "Current routine snapshot",
        productsInvolved,
        activesInvolved: null,
        irritationScore: null,
        drynessScore: null,
        breakoutsScore: null,
        notes: null,
      })
    }

    const csv = rowsToCsv(rows)
    const filename = `skincare-history-${date}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/export/history failed", { error: message })
    return NextResponse.json(
      { error: "Failed to export history" },
      { status: 500 },
    )
  }
}

