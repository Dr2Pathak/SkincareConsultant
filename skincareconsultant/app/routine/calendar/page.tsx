"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import {
  getRoutineCalendarBootstrap,
  updateScheduleOverrides,
  getGoogleCalendarStatus,
  syncGoogleCalendarWithAi,
} from "@/lib/data"
import { Textarea } from "@/components/ui/textarea"
import { buildCalendarBuckets, getDatesInRange } from "@/lib/calendar-buckets"
import type { CalendarDayBucket } from "@/lib/calendar-buckets"
import type { SavedRoutineSummary } from "@/lib/types"

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

function toggleDay(days: string[], day: string): string[] {
  return days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
}

export default function RoutineCalendarPage() {
  const { user } = useAuth()

  const [savedRoutines, setSavedRoutines] = useState<SavedRoutineSummary[]>([])
  const [defaultRoutineId, setDefaultRoutineId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [overridesLoaded, setOverridesLoaded] = useState(false)
  const [savingOverrides, setSavingOverrides] = useState(false)

  const [includeAm, setIncludeAm] = useState(true)
  const [includePm, setIncludePm] = useState(true)
  const [includeWeekly, setIncludeWeekly] = useState(false)
  const [amTime, setAmTime] = useState("07:30")
  const [pmTime, setPmTime] = useState("22:00")
  const [weeklyTime, setWeeklyTime] = useState("21:00")
  const [weeklyDays, setWeeklyDays] = useState<string[]>(["Mon", "Thu"])
  const [horizonDays, setHorizonDays] = useState(28)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suggesting, setSuggesting] = useState(false)

  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleStatusLoading, setGoogleStatusLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiBusy, setAiBusy] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [gcalBanner, setGcalBanner] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getRoutineCalendarBootstrap()
      .then((data) => {
        if (cancelled) return
        setSavedRoutines(data.savedRoutines)
        setOverrides(data.overrides)
        setOverridesLoaded(true)
        setDefaultRoutineId(data.defaultRoutineId)
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load your routines or calendar.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setGoogleStatusLoading(true)
    getGoogleCalendarStatus()
      .then((s) => {
        if (!cancelled) setGoogleConnected(s.connected)
      })
      .finally(() => {
        if (!cancelled) setGoogleStatusLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (typeof window === "undefined") return
    const p = new URLSearchParams(window.location.search)
    const g = p.get("gcal")
    if (g === "connected") setGcalBanner("Google Calendar connected. You can describe a sync below.")
    if (g === "error") setGcalBanner("Google connection failed. Try connecting again.")
  }, [])

  const scope = useMemo(
    () => ({ includeAm, includePm, includeWeekly }),
    [includeAm, includePm, includeWeekly],
  )
  const prefs = useMemo(
    () => ({ amTime, pmTime, weeklyTime, weeklyDays }),
    [amTime, pmTime, weeklyTime, weeklyDays],
  )

  const buckets = useMemo((): CalendarDayBucket[] => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return buildCalendarBuckets({
      defaultRoutineId,
      savedRoutines,
      overrides,
      horizonDays,
      scope,
      prefs,
      startDate: start,
    })
  }, [defaultRoutineId, savedRoutines, overrides, horizonDays, prefs, scope])

  const persistOverrides = useCallback(async (next: Record<string, string>) => {
    setSavingOverrides(true)
    try {
      await updateScheduleOverrides(next)
      setOverrides(next)
    } catch {
      // keep local state; user can retry
    } finally {
      setSavingOverrides(false)
    }
  }, [])

  const setRoutineForDay = useCallback(
    (date: string, routineId: string) => {
      const effectiveId = routineId === defaultRoutineId || routineId === "" ? undefined : routineId
      const next = { ...overrides }
      if (effectiveId) {
        next[date] = effectiveId
      } else {
        delete next[date]
      }
      persistOverrides(next)
    },
    [defaultRoutineId, overrides, persistOverrides],
  )

  const handleGoogleAiSync = useCallback(async () => {
    const msg = aiPrompt.trim()
    if (!msg) return
    setAiBusy(true)
    setAiResult(null)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const r = await syncGoogleCalendarWithAi({
        message: msg,
        includeAm,
        includePm,
        includeWeekly,
        amTime,
        pmTime,
        weeklyTime,
        weeklyDays,
        timeZone: tz,
        maxHorizonDays: horizonDays,
      })
      if (r.needsGoogleLink) {
        setAiResult("Connect Google Calendar first (button above).")
        setGoogleConnected(false)
      } else if (r.error) {
        setAiResult(r.error)
      } else {
        setAiResult(r.message ?? `Created ${r.created ?? 0} event(s).`)
        if ((r.created ?? 0) > 0) setGoogleConnected(true)
      }
    } catch (e) {
      setAiResult(e instanceof Error ? e.message : "Sync failed.")
    } finally {
      setAiBusy(false)
    }
  }, [
    aiPrompt,
    includeAm,
    includePm,
    includeWeekly,
    amTime,
    pmTime,
    weeklyTime,
    weeklyDays,
    horizonDays,
  ])

  const handleSuggest = useCallback(() => {
    if (savedRoutines.length < 2) {
      setIncludeAm(true)
      setIncludePm(true)
      setIncludeWeekly(true)
      setWeeklyDays(["Mon", "Thu"])
      setWeeklyTime("21:00")
      setSuggesting(false)
      return
    }
    setSuggesting(true)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const dates = getDatesInRange(start, horizonDays)
    const [, secondary] = savedRoutines
    const suggested: Record<string, string> = {}
    const treatmentDays = new Set(weeklyDays.map((d) => d.toLowerCase()))
    for (const dateStr of dates) {
      const d = new Date(dateStr + "T12:00:00")
      const dayName = WEEKDAY_NAMES[d.getDay()]
      if (treatmentDays.has(dayName.toLowerCase())) {
        suggested[dateStr] = secondary.id
      }
    }
    persistOverrides(suggested).finally(() => setSuggesting(false))
  }, [savedRoutines, horizonDays, weeklyDays, persistOverrides])

  const horizonOptions: { label: string; days: number }[] = [
    { label: "2 weeks", days: 14 },
    { label: "4 weeks", days: 28 },
    { label: "6 weeks", days: 42 },
  ]
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Routine calendar
            </h1>
            <div className="barrier-rule mt-3" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Choose which routine runs on which day. Your choices are saved automatically.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/routine">Back to routine builder</a>
          </Button>
        </div>

        {gcalBanner && (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground" role="status">
            {gcalBanner}
          </p>
        )}

        {!user && (
          <p className="text-sm text-muted-foreground">
            <a href="/login" className="underline hover:text-foreground">
              Sign in
            </a>{" "}
            to see and customize your routine calendar.
          </p>
        )}

        {user && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="rounded-lg border border-border bg-background p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Google Calendar (AI)</p>
                  <p className="text-xs text-muted-foreground">
                    Connect once, then describe what to sync in plain language. Uses the same schedule logic as this
                    page (Tree-of-Thoughts + your routines).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {googleStatusLoading ? (
                    <span className="text-xs text-muted-foreground">Checking link…</span>
                  ) : googleConnected ? (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
                  ) : (
                    <Button type="button" size="sm" variant="secondary" asChild>
                      <a href="/api/calendar/google/oauth/start">Connect Google Calendar</a>
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                placeholder='e.g. "Sync the next two weeks, mornings and evenings only"'
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                disabled={aiBusy}
                className="resize-y text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={() => void handleGoogleAiSync()} disabled={aiBusy || !aiPrompt.trim()}>
                  {aiBusy ? "Syncing…" : "Sync with AI"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Times and AM/PM/weekly toggles above are sent with your request.
                </span>
              </div>
              {aiResult && (
                <p className="text-sm text-foreground" role="status">
                  {aiResult}
                </p>
              )}
            </div>

            {loading && (
              <p className="text-sm text-muted-foreground">Loading your routines and calendar…</p>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {!loading && !error && (
              <>
                {/* Default routine + scope + times */}
                <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Default routine
                    </p>
                    <select
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                      value={defaultRoutineId ?? ""}
                      onChange={(e) => setDefaultRoutineId(e.target.value || null)}
                    >
                      {savedRoutines.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border text-primary focus-visible:outline-none"
                        checked={includeAm}
                        onChange={(e) => setIncludeAm(e.target.checked)}
                      />
                      <span>Include AM</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border text-primary focus-visible:outline-none"
                        checked={includePm}
                        onChange={(e) => setIncludePm(e.target.checked)}
                      />
                      <span>Include PM</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border text-primary focus-visible:outline-none"
                        checked={includeWeekly}
                        onChange={(e) => setIncludeWeekly(e.target.checked)}
                      />
                      <span>Weekly treatments</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        AM time
                      </p>
                      <input
                        type="time"
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                        value={amTime}
                        onChange={(e) => setAmTime(e.target.value || "07:30")}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        PM time
                      </p>
                      <input
                        type="time"
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                        value={pmTime}
                        onChange={(e) => setPmTime(e.target.value || "22:00")}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Treatment time
                      </p>
                      <input
                        type="time"
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                        value={weeklyTime}
                        onChange={(e) => setWeeklyTime(e.target.value || "21:00")}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Horizon
                      </p>
                      <select
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                        value={horizonDays}
                        onChange={(e) => setHorizonDays(Number(e.target.value) || 28)}
                      >
                        {horizonOptions.map((opt) => (
                          <option key={opt.days} value={opt.days}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Weekly treatment nights
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {weekdayLabels.map((day) => {
                        const active = weeklyDays.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setWeeklyDays(toggleDay(weeklyDays, day))}
                            className={[
                              "h-7 rounded-full px-3 text-xs font-medium transition-colors",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80",
                            ].join(" ")}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Not sure where to start?</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSuggest}
                      disabled={suggesting || savedRoutines.length < 2}
                    >
                      {suggesting ? "Suggesting…" : "Suggest schedule (beta)"}
                    </Button>
                    {savingOverrides && (
                      <span className="text-xs text-muted-foreground">Saving…</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-background p-3 sm:p-4">
                  {!overridesLoaded && (
                    <p className="text-sm text-muted-foreground">Loading your saved assignments…</p>
                  )}
                  {overridesLoaded && savedRoutines.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No saved routines yet. Create and save a routine on the routine builder, then
                      return here.
                    </p>
                  )}
                  {overridesLoaded && savedRoutines.length > 0 && buckets.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {buckets.map((bucket) => (
                          <div
                            key={bucket.date}
                            className="flex flex-col rounded-lg border border-border bg-card p-3 text-xs"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {bucket.date}
                              </span>
                              <select
                                className="h-6 min-w-0 max-w-[120px] rounded border border-border bg-background px-1.5 text-[10px]"
                                value={bucket.routineId}
                                onChange={(e) => setRoutineForDay(bucket.date, e.target.value)}
                                aria-label={`Routine for ${bucket.date}`}
                              >
                                {savedRoutines.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              {bucket.events.length === 0 && (
                                <p className="text-[11px] text-muted-foreground">
                                  No events (routine has no steps or scope off).
                                </p>
                              )}
                              {bucket.events.map((evt) => {
                                const isAm = evt.tags.includes("am")
                                const isPm = evt.tags.includes("pm")
                                const isWeekly = evt.tags.includes("weekly")
                                const chipLabel = isWeekly
                                  ? "Treatment"
                                  : isAm
                                    ? "AM"
                                    : isPm
                                      ? "PM"
                                      : evt.tags.join(", ")
                                return (
                                  <div
                                    key={evt.id}
                                    className="rounded-md border border-border bg-background px-2 py-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[11px] font-medium text-muted-foreground">
                                        {evt.time}
                                      </span>
                                      {chipLabel && (
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                                          {chipLabel}
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-0.5 truncate text-[12px] text-foreground">
                                      {evt.label}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
