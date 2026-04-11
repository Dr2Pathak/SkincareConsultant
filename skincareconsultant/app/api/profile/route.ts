/**
 * GET /api/profile — current user's profile (auth optional: default profile when anonymous).
 * PATCH /api/profile — upsert profile for authenticated user.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { getSupabaseServer } from "@/lib/supabase/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import type { UserProfile } from "@/lib/types"

const DEFAULT_PROFILE: UserProfile = {
  skinTypes: ["combination", "sensitive"],
  concerns: ["acne", "pigmentation", "hydration"],
  avoidList: ["fragrance", "alcohol denat", "essential oils"],
  tolerance: "medium",
}

const patchSchema = z.object({
  skinTypes: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  avoidList: z.array(z.string()).max(200).optional(),
  tolerance: z.enum(["low", "medium", "high"]).optional(),
})

function rowToProfile(profileRow: {
  skin_types?: unknown
  concerns?: unknown
  avoid_list?: unknown
  tolerance?: unknown
}): UserProfile {
  return {
    skinTypes: (Array.isArray(profileRow.skin_types) ? profileRow.skin_types : []) as UserProfile["skinTypes"],
    concerns: (Array.isArray(profileRow.concerns) ? profileRow.concerns : []) as UserProfile["concerns"],
    avoidList: (Array.isArray(profileRow.avoid_list) ? profileRow.avoid_list : []) as string[],
    tolerance: (profileRow.tolerance ?? "medium") as UserProfile["tolerance"],
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    const supabase = getSupabaseServer()

    if (!user) {
      return NextResponse.json(DEFAULT_PROFILE)
    }

    const { data: profileRow, error } = await supabase
      .from("profiles")
      .select("skin_types, concerns, avoid_list, tolerance")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      console.error("GET /api/profile select failed", { userId: user.id, error: error.message })
      return NextResponse.json(
        { error: "Failed to load profile" },
        { status: 500 },
      )
    }

    if (!profileRow) {
      return NextResponse.json(DEFAULT_PROFILE)
    }

    return NextResponse.json(rowToProfile(profileRow))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/profile failed", { error: message })
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    const parsed = patchSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 })
    }

    const body = parsed.data
    const supabase = getSupabaseServer()

    const update: Record<string, unknown> = {
      id: user.id,
      updated_at: new Date().toISOString(),
    }
    if (body.skinTypes !== undefined) update.skin_types = body.skinTypes
    if (body.concerns !== undefined) update.concerns = body.concerns
    if (body.avoidList !== undefined) update.avoid_list = body.avoidList
    if (body.tolerance !== undefined) update.tolerance = body.tolerance

    const { error } = await supabase.from("profiles").upsert(update, { onConflict: "id" })

    if (error) {
      console.error("PATCH /api/profile upsert failed", { userId: user.id, error: error.message })
      return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("skin_types, concerns, avoid_list, tolerance")
      .eq("id", user.id)
      .maybeSingle()

    return NextResponse.json(profileRow ? rowToProfile(profileRow) : DEFAULT_PROFILE)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("PATCH /api/profile failed", { error: message })
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}
