import { cacheGet, cacheSet } from "@/lib/cache/redis"

export type JobStatus = "pending" | "running" | "completed" | "failed"

export type CalendarSyncJob = {
  id: string
  userId: string
  status: JobStatus
  createdAt: string
  updatedAt: string
  result?: {
    created?: number
    errors?: string[]
    horizonDays?: number
    eventCount?: number
    message?: string
  }
  error?: string
}

const JOB_TTL_SECONDS = 3600

function jobKey(id: string): string {
  return `skinsafe:job:calendar-sync:${id}`
}

export async function createCalendarSyncJob(userId: string): Promise<CalendarSyncJob> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const job: CalendarSyncJob = {
    id,
    userId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }
  await cacheSet(jobKey(id), JSON.stringify(job), JOB_TTL_SECONDS)
  return job
}

export async function getCalendarSyncJob(id: string): Promise<CalendarSyncJob | null> {
  const raw = await cacheGet(jobKey(id))
  if (!raw) return null
  try {
    return JSON.parse(raw) as CalendarSyncJob
  } catch {
    return null
  }
}

export async function updateCalendarSyncJob(
  id: string,
  patch: Partial<CalendarSyncJob>,
): Promise<CalendarSyncJob | null> {
  const job = await getCalendarSyncJob(id)
  if (!job) return null
  const updated: CalendarSyncJob = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await cacheSet(jobKey(id), JSON.stringify(updated), JOB_TTL_SECONDS)
  return updated
}
