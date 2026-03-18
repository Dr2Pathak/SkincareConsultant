/**
 * Data layer: uses API when NEXT_PUBLIC_USE_MOCK is not "true", else mock data.
 * Use these functions from pages so switching backend is one env var.
 */

import * as api from "./api"
import {
  mockProfile,
  mockRoutine,
  mockProducts,
  mockKnowledgeGraph,
  mockRoutineHealth,
  getProductById as mockGetProductById,
  searchProducts as mockSearchProducts,
  getCompatibilityResult as mockGetCompatibilityResult,
} from "./mock-data"
import type {
  UserProfile,
  Routine,
  SavedRoutineSummary,
  Product,
  CompatibilityResult,
  KnowledgeGraph,
  RoutineHealth,
  RoutineInsights,
} from "./types"
import type { RoutineScheduleEvent } from "./routine-schedule"

/** True when env NEXT_PUBLIC_USE_MOCK is "true". Use for conditional UI (e.g. routine page initial state). */
export const USE_MOCK =
  typeof process.env.NEXT_PUBLIC_USE_MOCK === "string" && process.env.NEXT_PUBLIC_USE_MOCK === "true"
const useMock = USE_MOCK

export async function getProfile(): Promise<UserProfile> {
  if (useMock) return Promise.resolve(mockProfile)
  return api.getProfile()
}

export async function getRoutine(): Promise<Routine> {
  if (useMock) return Promise.resolve(mockRoutine)
  return api.getRoutine()
}

export async function saveRoutine(routine: Routine): Promise<{ id?: string }> {
  if (useMock) return Promise.resolve({})
  return api.saveRoutine(routine)
}

export async function getRoutines(): Promise<SavedRoutineSummary[]> {
  if (useMock) return Promise.resolve([])
  return api.getRoutines()
}

export async function setCurrentRoutine(routineId: string): Promise<void> {
  if (useMock) return Promise.resolve()
  return api.setCurrentRoutine(routineId)
}

export async function deleteRoutine(routineId: string): Promise<void> {
  if (useMock) return Promise.resolve()
  return api.deleteRoutine(routineId)
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (useMock) return Promise.resolve(mockSearchProducts(query))
  return api.searchProducts(query)
}

export async function getProduct(id: string): Promise<Product | undefined | null> {
  if (useMock) return Promise.resolve(mockGetProductById(id))
  return api.getProduct(id)
}

export async function getCompatibility(productId: string): Promise<CompatibilityResult> {
  if (useMock) return Promise.resolve(mockGetCompatibilityResult(productId))
  return api.getCompatibility(productId)
}

export async function getKnowledgeGraph(): Promise<KnowledgeGraph> {
  if (useMock) return Promise.resolve(mockKnowledgeGraph)
  return api.getKnowledgeGraph()
}

export async function getRoutineHealth(): Promise<RoutineHealth> {
  if (useMock) return Promise.resolve(mockRoutineHealth)
  return api.getRoutineHealth()
}

export async function getRoutineInsights(): Promise<RoutineInsights> {
  if (useMock) return Promise.resolve({ conflicts: [], helps: [] })
  return api.getRoutineInsights()
}

export async function getRoutineBootstrap(): Promise<{
  routine: Routine
  health: RoutineHealth
  insights: RoutineInsights
  savedRoutines: SavedRoutineSummary[]
  scheduleEvents: RoutineScheduleEvent[]
}> {
  if (useMock) {
    return Promise.resolve({
      routine: mockRoutine,
      health: mockRoutineHealth,
      insights: { conflicts: [], helps: [], hasRoutineProducts: false } as RoutineInsights,
      savedRoutines: [],
      scheduleEvents: [],
    })
  }
  const res = (await api.getRoutineBootstrap()) as {
    routine: Routine
    health: RoutineHealth
    insights: RoutineInsights
    savedRoutines: SavedRoutineSummary[]
    scheduleEvents: RoutineScheduleEvent[]
  }
  return res
}

export async function getRoutineSchedulePreview(params: {
  routineId?: string
  includeAm?: boolean
  includePm?: boolean
  includeWeekly?: boolean
  horizonDays?: number
  amTime?: string
  pmTime?: string
  weeklyDays?: string[]
  weeklyTime?: string
}): Promise<{ events: RoutineScheduleEvent[] }> {
  if (useMock) {
    // Simple mock: no events when using mock data for now.
    return Promise.resolve({ events: [] })
  }
  return api.getRoutineSchedulePreview(params) as Promise<{ events: RoutineScheduleEvent[] }>
}

export async function downloadRoutineScheduleIcs(params: {
  routineId?: string
  includeAm?: boolean
  includePm?: boolean
  includeWeekly?: boolean
  horizonDays?: number
  amTime?: string
  pmTime?: string
  weeklyDays?: string[]
  weeklyTime?: string
}): Promise<Blob | null> {
  if (useMock) {
    return Promise.resolve(null)
  }
  return api.downloadRoutineScheduleIcs(params)
}

export async function downloadHistoryCsv(): Promise<Blob | null> {
  if (useMock) {
    return Promise.resolve(null)
  }
  return api.downloadHistoryCsv()
}

export async function getScheduleOverrides(): Promise<Record<string, string>> {
  if (useMock) return Promise.resolve({})
  return api.getScheduleOverrides()
}

export async function updateScheduleOverrides(overrides: Record<string, string>): Promise<void> {
  if (useMock) return Promise.resolve()
  return api.updateScheduleOverrides(overrides)
}

export async function getRoutineCalendarBootstrap(): Promise<{
  defaultRoutineId: string | null
  savedRoutines: SavedRoutineSummary[]
  overrides: Record<string, string>
}> {
  if (useMock) {
    return Promise.resolve({
      defaultRoutineId: null,
      savedRoutines: [],
      overrides: {},
    })
  }
  return api.getRoutineCalendarBootstrap()
}

export async function getRoutineIngredientIds(): Promise<{ ingredientIds: string[] }> {
  if (useMock) {
    return Promise.resolve({ ingredientIds: [] })
  }
  return api.getRoutineIngredientIds()
}

export async function sendChatMessage(
  message: string,
  routine?: { am: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }>; pm: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }> }
): Promise<{ reply: string }> {
  if (useMock) {
    const lower = message.toLowerCase()
    if (lower.includes("retinol")) {
      return Promise.resolve({
        reply:
          "Retinol is a powerful ingredient for anti-aging and acne. Remember not to combine it with AHAs or BHAs in the same routine to avoid irritation.",
      })
    }
    if (lower.includes("niacinamide")) {
      return Promise.resolve({
        reply:
          "Niacinamide is great for your concerns! It helps with acne, pigmentation, and barrier support. It pairs well with most ingredients.",
      })
    }
    if (lower.includes("sunscreen") || lower.includes("spf")) {
      return Promise.resolve({
        reply:
          "Sunscreen is essential, especially when using actives like retinol. Make sure to reapply every 2 hours when outdoors.",
      })
    }
    return Promise.resolve({
      reply:
        "I can help you understand your routine, check ingredients, and answer skincare questions. Try asking about specific ingredients like retinol, niacinamide, or vitamin C!",
    })
  }
  return api.sendChatMessage(message, routine)
}

/** For components that need a product list when in mock mode (e.g. routine step picker). */
export function getMockProductsForPicker(): Product[] {
  return useMock ? mockProducts : []
}
