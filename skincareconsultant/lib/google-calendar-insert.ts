/**
 * Insert routine schedule events into the user's primary Google Calendar using a refresh token.
 */

import { createHash } from "crypto"
import { google } from "googleapis"
import type { RoutineScheduleEvent } from "@/lib/routine-schedule"

function getOAuthRedirectUri(): string {
  const explicit = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (explicit) return explicit.replace(/\/$/, "")
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (site) return `${site}/api/calendar/google/oauth/callback`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/calendar/google/oauth/callback`
  return "http://localhost:3000/api/calendar/google/oauth/callback"
}

export function createGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET")
  }
  return new google.auth.OAuth2(clientId, clientSecret, getOAuthRedirectUri())
}

export function getGoogleCalendarAuthUrl(state: string): string {
  const oauth2 = createGoogleOAuth2Client()
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  })
}

export async function exchangeCodeForRefreshToken(code: string): Promise<string> {
  const oauth2 = createGoogleOAuth2Client()
  const { tokens } = await oauth2.getToken(code)
  const refresh = tokens.refresh_token
  if (!refresh) {
    throw new Error("Google did not return a refresh token; try revoking app access and reconnecting.")
  }
  return refresh
}

function addMinutesToClock(timeHHmm: string, add: number): string {
  const [h, m] = timeHHmm.split(":").map((x) => parseInt(x, 10))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return timeHHmm
  let total = h * 60 + m + add
  total = Math.min(total, 23 * 60 + 59)
  const eh = Math.floor(total / 60)
  const em = total % 60
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`
}

function stableEventId(evt: RoutineScheduleEvent): string {
  return createHash("sha256")
    .update(`${evt.routineId ?? ""}|${evt.date}|${evt.time}|${evt.id}|${evt.label}`)
    .digest("hex")
    .slice(0, 40)
}

export async function insertRoutineEventsToGoogleCalendar(
  refreshToken: string,
  events: RoutineScheduleEvent[],
  timeZone: string,
): Promise<{ created: number; errors: string[] }> {
  const oauth2 = createGoogleOAuth2Client()
  oauth2.setCredentials({ refresh_token: refreshToken })
  const calendar = google.calendar({ version: "v3", auth: oauth2 })
  const tz = timeZone || "UTC"
  const errors: string[] = []
  let created = 0

  for (const evt of events) {
    const endTime = addMinutesToClock(evt.time, 45)
    const privId = stableEventId(evt)
    const description = evt.products?.length
      ? `Products: ${evt.products.map((p) => `${p.name} (${p.brand})`).join(", ")}`.slice(0, 8000)
      : undefined

    try {
      await calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: evt.label.slice(0, 500),
          description,
          start: {
            dateTime: `${evt.date}T${evt.time}:00`,
            timeZone: tz,
          },
          end: {
            dateTime: `${evt.date}T${endTime}:00`,
            timeZone: tz,
          },
          extendedProperties: {
            private: {
              skincareconsultantEventId: privId,
            },
          },
        },
      })
      created += 1
    } catch (e) {
      const msg = e instanceof Error ? e.message : "insert failed"
      errors.push(`${evt.date} ${evt.time}: ${msg}`)
      console.error("Google Calendar insert failed", { date: evt.date, label: evt.label, error: msg })
    }
  }

  return { created, errors }
}
