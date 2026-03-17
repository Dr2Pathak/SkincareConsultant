import type { Routine, RoutineStep, Product } from "./types"

export type RoutineScheduleScope = {
  includeAm: boolean
  includePm: boolean
  includeWeekly: boolean
}

export type RoutineSchedulePrefs = {
  amTime?: string
  pmTime?: string
  weeklyDays?: string[]
  weeklyTime?: string
}

export type RoutineScheduleEvent = {
  id: string
  date: string
  time: string
  label: string
  routineId?: string
  routineName?: string
  products: Array<Pick<Product, "id" | "name" | "brand">>
  tags: string[]
}

type BuildOptions = {
  horizonDays: number
  today?: Date
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getProductsFromSteps(steps: RoutineStep[]): Array<Pick<Product, "id" | "name" | "brand">> {
  const seen = new Set<string>()
  const result: Array<Pick<Product, "id" | "name" | "brand">> = []
  for (const step of steps) {
    if (step.product && !seen.has(step.product.id)) {
      seen.add(step.product.id)
      result.push({
        id: step.product.id,
        name: step.product.name,
        brand: step.product.brand,
      })
    }
  }
  return result
}

const DEFAULT_AM_TIME = "07:30"
const DEFAULT_PM_TIME = "22:00"
const DEFAULT_WEEKLY_TIME = "21:00"

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export function buildRoutineSchedule(
  routine: Routine,
  prefs: RoutineSchedulePrefs,
  scope: RoutineScheduleScope,
  options: BuildOptions,
): RoutineScheduleEvent[] {
  const events: RoutineScheduleEvent[] = []
  const start = options.today ? new Date(options.today) : new Date()
  start.setHours(0, 0, 0, 0)

  const horizon = Math.max(1, options.horizonDays)
  const weeklyDaysSet = new Set(
    (prefs.weeklyDays ?? ["Mon", "Thu"]).map((d) => d.toLowerCase()),
  )

  let counter = 0

  for (let offset = 0; offset < horizon; offset++) {
    const day = new Date(start)
    day.setDate(start.getDate() + offset)
    const dateStr = formatDate(day)
    const weekdayName = WEEKDAY_NAMES[day.getDay()]
    const weekdayKey = weekdayName.toLowerCase()

    if (scope.includeAm && routine.am.length > 0) {
      const time = prefs.amTime ?? DEFAULT_AM_TIME
      const label = routine.name ? `${routine.name} – Morning` : "Morning routine"
      events.push({
        id: `am-${dateStr}-${counter++}`,
        date: dateStr,
        time,
        label,
        routineId: routine.id,
        routineName: routine.name,
        products: getProductsFromSteps(routine.am),
        tags: ["am", "routine"],
      })
    }

    if (scope.includePm && routine.pm.length > 0) {
      const time = prefs.pmTime ?? DEFAULT_PM_TIME
      const label = routine.name ? `${routine.name} – Evening` : "Evening routine"
      events.push({
        id: `pm-${dateStr}-${counter++}`,
        date: dateStr,
        time,
        label,
        routineId: routine.id,
        routineName: routine.name,
        products: getProductsFromSteps(routine.pm),
        tags: ["pm", "routine"],
      })
    }

    if (scope.includeWeekly && weeklyDaysSet.has(weekdayKey) && routine.pm.length > 0) {
      const time = prefs.weeklyTime ?? prefs.pmTime ?? DEFAULT_WEEKLY_TIME
      const label = routine.name
        ? `${routine.name} – Weekly treatment`
        : "Weekly treatment night"
      events.push({
        id: `weekly-${dateStr}-${counter++}`,
        date: dateStr,
        time,
        label,
        routineId: routine.id,
        routineName: routine.name,
        products: getProductsFromSteps(routine.pm),
        tags: ["weekly", "treatment"],
      })
    }
  }

  return events
}

