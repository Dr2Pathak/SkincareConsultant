/**
 * GET /api/profile — returns current user profile from Supabase.
 * Without auth we return a default profile so the app works; wire auth later.
 */

import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase/server"
import type { UserProfile } from "@/lib/types"

const DEFAULT_PROFILE: UserProfile = {
  skinTypes: ["combination", "sensitive"],
  concerns: ["acne", "pigmentation", "hydration"],
  avoidList: ["fragrance", "alcohol denat", "essential oils"],
  tolerance: "medium",
}

export async function GET() {
  try {
    const supabase = getSupabaseServer()
    // TODO: get user from Supabase Auth (e.g. (await supabase.auth.getUser()).data.user?.id)
    // For now use a placeholder user id for dev; create profile via SQL if needed
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("skin_types, concerns, avoid_list, tolerance")
      .limit(1)
      .maybeSingle()

    if (!profileRow) {
      return NextResponse.json(DEFAULT_PROFILE)
    }

    const profile: UserProfile = {
      skinTypes: (profileRow.skin_types ?? []) as UserProfile["skinTypes"],
      concerns: (profileRow.concerns ?? []) as UserProfile["concerns"],
      avoidList: (profileRow.avoid_list ?? []) as string[],
      tolerance: (profileRow.tolerance ?? "medium") as UserProfile["tolerance"],
    }
    return NextResponse.json(profile)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("GET /api/profile failed", { error: message })
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    )
  }
}
