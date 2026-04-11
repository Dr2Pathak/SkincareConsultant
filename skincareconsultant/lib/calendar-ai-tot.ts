/**
 * Tree-of-Thoughts style interpretation: generate branches, then score and pick one winner.
 * Output is validated against saved routines and horizon caps before any Google Calendar writes.
 */

import { generateJsonText } from "@/lib/gemini"
import type { RoutineScheduleScope } from "@/lib/routine-schedule"

export type CalendarTotSuccess = {
  horizonDays: number
  scope: RoutineScheduleScope
  effectiveDefaultRoutineId: string
}

export type CalendarTotResult =
  | { ok: true; data: CalendarTotSuccess }
  | { ok: false; message: string }

type Branch = {
  id: string
  interpretation_summary?: string
  horizon_days?: number
  include_am?: boolean
  include_pm?: boolean
  include_weekly?: boolean
  routine_id?: string | null
}

export async function interpretCalendarRequestWithTot(
  message: string,
  ctx: {
    defaultRoutineId: string | null
    savedRoutines: { id: string; name: string }[]
    maxHorizonDays: number
  },
): Promise<CalendarTotResult> {
  if (!ctx.defaultRoutineId || ctx.savedRoutines.length === 0) {
    return {
      ok: false,
      message: "Save at least one routine before syncing to Google Calendar.",
    }
  }

  const routinesJson = JSON.stringify(ctx.savedRoutines)
  const phase1Sys = `You interpret requests about exporting a skincare routine schedule to Google Calendar.
Return JSON only, shape:
{ "branches": [ { "id": string, "interpretation_summary": string, "horizon_days": number, "include_am": boolean, "include_pm": boolean, "include_weekly": boolean, "routine_id": string | null } ] }
Rules:
- Produce exactly 2 or 3 branches with distinct ids (e.g. "b1","b2","b3").
- horizon_days integer from 1 to ${ctx.maxHorizonDays}.
- routine_id must be one of the routine ids provided below, or null to use the app's default routine + per-day overrides.
- At least one of include_am, include_pm, include_weekly must be true in every branch.`

  const phase1User = `Default routine id: ${ctx.defaultRoutineId}.
Routines (id + name): ${routinesJson}
Today (UTC date): ${new Date().toISOString().slice(0, 10)}

User request:
${message}`

  let branches: Branch[]
  try {
    const raw = await generateJsonText(phase1Sys, phase1User)
    const parsed = JSON.parse(raw) as { branches?: unknown }
    if (!Array.isArray(parsed.branches) || parsed.branches.length < 2) {
      return {
        ok: false,
        message:
          "I could not interpret that clearly. Try something like: “Sync the next 14 days, mornings and evenings.”",
      }
    }
    branches = parsed.branches as Branch[]
  } catch {
    return {
      ok: false,
      message: "I could not parse your request. Try a shorter description with how many days and AM/PM.",
    }
  }

  const phase2Sys = `You score interpretation branches for syncing a skincare calendar. Return JSON only:
{ "winner_id": string | null, "scores": { "[branchId]": number }, "reason": string }
winner_id is the best branch id, or null if all are poor. Scores are integers 1–10. Prefer branches that match explicit user wording (horizon, AM/PM, weekly).`

  const phase2User = `Branches:
${JSON.stringify(branches, null, 2)}

Hard constraints:
- horizon_days must be 1–${ctx.maxHorizonDays}.
- routine_id must be null or one of: ${ctx.savedRoutines.map((r) => r.id).join(", ")}.
- At least one scope flag true.`

  let winnerId: string | null
  try {
    const raw2 = await generateJsonText(phase2Sys, phase2User)
    const parsed2 = JSON.parse(raw2) as { winner_id?: string | null }
    winnerId = typeof parsed2.winner_id === "string" ? parsed2.winner_id : null
  } catch {
    return {
      ok: false,
      message: "Could not evaluate scheduling options. Please try again.",
    }
  }

  const winner = branches.find((b) => b.id === winnerId)
  if (!winner) {
    return {
      ok: false,
      message:
        "Your request was ambiguous. Try specifying the number of days and whether you want AM, PM, or weekly treatments.",
    }
  }

  const horizon = Math.round(Number(winner.horizon_days))
  if (!Number.isFinite(horizon) || horizon < 1 || horizon > ctx.maxHorizonDays) {
    return { ok: false, message: `Choose a horizon between 1 and ${ctx.maxHorizonDays} days.` }
  }

  const scope: RoutineScheduleScope = {
    includeAm: Boolean(winner.include_am),
    includePm: Boolean(winner.include_pm),
    includeWeekly: Boolean(winner.include_weekly),
  }
  if (!scope.includeAm && !scope.includePm && !scope.includeWeekly) {
    return { ok: false, message: "Select at least one of AM, PM, or weekly treatments to sync." }
  }

  let effectiveDefaultRoutineId = ctx.defaultRoutineId
  if (winner.routine_id != null && winner.routine_id !== "") {
    const found = ctx.savedRoutines.some((r) => r.id === winner.routine_id)
    if (!found) {
      return { ok: false, message: "That routine was not found in your saved routines." }
    }
    effectiveDefaultRoutineId = winner.routine_id
  }

  return {
    ok: true,
    data: {
      horizonDays: horizon,
      scope,
      effectiveDefaultRoutineId,
    },
  }
}
