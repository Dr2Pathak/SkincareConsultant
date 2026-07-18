/**
 * GET /api/calendar/google/sync/status?jobId= — poll async calendar sync job.
 */

import { NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getCalendarSyncJob } from "@/lib/jobs/calendar-sync-store"

export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const jobId = new URL(request.url).searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 })
  }

  const job = await getCalendarSyncJob(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }
  if (job.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(job)
}
