/**
 * POST /api/calendar/google/sync — enqueue async Tree-of-Thoughts + Google Calendar sync.
 * Returns 202 + jobId; poll GET /api/calendar/google/sync/status?jobId=
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getChatEnvError } from "@/lib/env"
import { createCalendarSyncJob } from "@/lib/jobs/calendar-sync-store"
import { processCalendarSyncJob } from "@/lib/jobs/process-calendar-sync"

const MAX_HORIZON = 42

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  includeAm: z.boolean().optional(),
  includePm: z.boolean().optional(),
  includeWeekly: z.boolean().optional(),
  amTime: z.string().optional(),
  pmTime: z.string().optional(),
  weeklyTime: z.string().optional(),
  weeklyDays: z.array(z.string()).optional(),
  timeZone: z.string().max(80).optional(),
  maxHorizonDays: z.number().int().min(1).max(MAX_HORIZON).optional(),
  /** Set true to run synchronously (legacy/tests). Default: async job. */
  sync: z.boolean().optional(),
})

export async function POST(request: Request) {
  const envError = getChatEnvError()
  if (envError) {
    return NextResponse.json({ error: envError }, { status: 503 })
  }

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google Calendar is not configured (missing OAuth env vars)." },
      { status: 503 },
    )
  }

  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 })
    }

    const body = parsed.data
    const job = await createCalendarSyncJob(user.id)

    const run = () => processCalendarSyncJob(job.id, user.id, body)

    if (body.sync === true || process.env.CALENDAR_SYNC_INLINE === "1") {
      await run()
      const { getCalendarSyncJob } = await import("@/lib/jobs/calendar-sync-store")
      const finished = await getCalendarSyncJob(job.id)
      if (!finished) {
        return NextResponse.json({ error: "Job lost" }, { status: 500 })
      }
      if (finished.status === "failed") {
        return NextResponse.json({ error: finished.error ?? "Sync failed", jobId: job.id }, { status: 400 })
      }
      return NextResponse.json({ jobId: job.id, status: finished.status, ...finished.result })
    }

    void run()

    return NextResponse.json(
      {
        jobId: job.id,
        status: "pending",
        message: "Calendar sync started. Poll /api/calendar/google/sync/status?jobId=" + job.id,
      },
      { status: 202 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("POST /api/calendar/google/sync failed", { error: message })
    return NextResponse.json({ error: message.slice(0, 500) }, { status: 500 })
  }
}
