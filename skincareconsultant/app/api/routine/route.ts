/**
 * GET /api/routine — returns the current routine (is_current = true, or latest).
 * POST /api/routine — saves routine (create or update by id). Requires auth.
 * Table: routines (id, user_id, name?, am, pm, is_current?, updated_at).
 * Run migration: add name (text default 'My routine'), is_current (boolean default true).
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import type { Routine, RoutineStep } from "@/lib/types"

const ROUTINE_NAME_MAX_LENGTH = 64
const DEFAULT_NAME = "My routine"

function normalizeRoutineName(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : ""
  const name = s || DEFAULT_NAME
  return name.slice(0, ROUTINE_NAME_MAX_LENGTH)
}

const DEFAULT_ROUTINE: Routine = {
  am: [],
  pm: [],
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    const supabase = getSupabaseServer()

    if (!user) {
      return NextResponse.json(DEFAULT_ROUTINE)
    }

    let row: { id?: string; name?: string; am?: unknown[]; pm?: unknown[] } | null = null
    const { data: current } = await supabase
      .from("routines")
      .select("id, name, am, pm")
      .eq("user_id", user.id)
      .eq("is_current", true)
      .maybeSingle()
    row = current ?? null
    if (!row) {
      const { data: latest } = await supabase
        .from("routines")
        .select("id, name, am, pm")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      row = latest
    }

    if (!row) {
      return NextResponse.json(DEFAULT_ROUTINE)
    }

    const routine: Routine = {
      id: row.id,
      name: row.name ?? DEFAULT_NAME,
      am: (Array.isArray(row.am) ? row.am : []) as RoutineStep[],
      pm: (Array.isArray(row.pm) ? row.pm : []) as RoutineStep[],
    }
    return NextResponse.json(routine)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/routine failed", { error: message })
    return NextResponse.json(
      { error: "Failed to load routine" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to save your routine. Create an account or log in, then try again." },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === "string" ? body.id : undefined
    const name = normalizeRoutineName(body.name)
    const am = Array.isArray(body.am) ? body.am : []
    const pm = Array.isArray(body.pm) ? body.pm : []
    const supabase = getSupabaseServer()

    if (id) {
      const { data: existing } = await supabase
        .from("routines")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle()
      if (existing) {
        const { error } = await supabase
          .from("routines")
          .update({ name, am, pm, updated_at: new Date().toISOString() })
          .eq("id", id)
        if (error) {
          console.error("POST /api/routine update failed", { error: error.message })
          return NextResponse.json({ error: "Failed to save routine" }, { status: 500 })
        }
        return NextResponse.json({ ok: true, id })
      }
    }

    const { data: inserted, error } = await supabase
      .from("routines")
      .insert({
        user_id: user.id,
        name,
        am,
        pm,
        is_current: true,
      })
      .select("id")
      .single()
    if (error) {
      console.error("POST /api/routine insert failed", { error: error.message })
      const msg = error.message
      const isDuplicateKey = /duplicate key|routines_user_id_key|unique constraint/i.test(msg)
      const userMessage = isDuplicateKey
        ? "Your database allows only one routine per user. Run: ALTER TABLE routines DROP CONSTRAINT IF EXISTS routines_user_id_key;"
        : "Failed to save routine"
      const details = process.env.NODE_ENV !== "production" && !isDuplicateKey ? msg : undefined
      return NextResponse.json(
        { error: userMessage, ...(details && { details }) },
        { status: 500 }
      )
    }
    const newId = inserted?.id
    if (newId) {
      await supabase.from("routines").update({ is_current: false }).eq("user_id", user.id)
      await supabase.from("routines").update({ is_current: true }).eq("id", newId).eq("user_id", user.id)
    }
    return NextResponse.json({ ok: true, id: newId })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("POST /api/routine failed", { error: message })
    return NextResponse.json({ error: "Failed to save routine" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to delete a routine." },
        { status: 401 }
      )
    }
    const url = new URL(request.url)
    const routineId = url.searchParams.get("id") ?? url.searchParams.get("routineId")
    if (!routineId || typeof routineId !== "string") {
      return NextResponse.json(
        { error: "id or routineId is required" },
        { status: 400 }
      )
    }
    const supabase = getSupabaseServer()
    const { data: row } = await supabase
      .from("routines")
      .select("id, is_current")
      .eq("id", routineId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!row) {
      return NextResponse.json(
        { error: "Routine not found" },
        { status: 404 }
      )
    }
    const wasCurrent = Boolean(row.is_current)
    const { error: deleteError } = await supabase.from("routines").delete().eq("id", routineId).eq("user_id", user.id)
    if (deleteError) {
      console.error("DELETE /api/routine failed", { error: deleteError.message })
      return NextResponse.json({ error: "Failed to delete routine" }, { status: 500 })
    }
    if (wasCurrent) {
      const { data: next } = await supabase
        .from("routines")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (next?.id) {
        await supabase.from("routines").update({ is_current: false }).eq("user_id", user.id)
        await supabase.from("routines").update({ is_current: true }).eq("id", next.id)
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("DELETE /api/routine failed", { error: message })
    return NextResponse.json(
      { error: "Failed to delete routine" },
      { status: 500 }
    )
  }
}
