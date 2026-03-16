/**
 * GET /api/schedule-overrides — returns persisted per-day routine assignments (date -> routineId).
 * PATCH /api/schedule-overrides — saves overrides. Body: { overrides: Record<string, string> }.
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"

function isValidOverrides(value: unknown): value is Record<string, string> {
  if (value === null || typeof value !== "object") return false
  for (const k of Object.keys(value)) {
    if (typeof k !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return false
    if (typeof (value as Record<string, unknown>)[k] !== "string") return false
  }
  return true
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Sign in to load schedule overrides." }, { status: 401 })
    }
    const supabase = getSupabaseServer()
    const { data } = await supabase
      .from("profiles")
      .select("schedule_overrides")
      .eq("id", user.id)
      .maybeSingle()
    const overrides = (data?.schedule_overrides ?? {}) as Record<string, string>
    return NextResponse.json({ overrides: isValidOverrides(overrides) ? overrides : {} })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/schedule-overrides failed", { error: message })
    return NextResponse.json(
      { error: "Failed to load schedule overrides" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to save schedule overrides." },
        { status: 401 },
      )
    }
    const body = await request.json().catch(() => ({})) as { overrides?: unknown }
    const overrides = body.overrides
    if (!isValidOverrides(overrides)) {
      return NextResponse.json(
        { error: "Invalid overrides: must be an object of date keys (YYYY-MM-DD) to routine id strings." },
        { status: 400 },
      )
    }
    const supabase = getSupabaseServer()
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          schedule_overrides: overrides,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
    if (error) {
      console.error("PATCH /api/schedule-overrides failed", { error: error.message })
      return NextResponse.json(
        { error: "Failed to save schedule overrides" },
        { status: 500 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("PATCH /api/schedule-overrides failed", { error: message })
    return NextResponse.json(
      { error: "Failed to save schedule overrides" },
      { status: 500 },
    )
  }
}
