/**
 * API client for REST backend.
 * Use when NEXT_PUBLIC_USE_MOCK is false.
 * Endpoints: /api/profile, /api/routine, /api/products, /api/product?id=, /api/compatibility, /api/graph, /api/routine-health, /api/chat
 */

import { getAccessToken } from "./auth-token";
import type {
  UserProfile,
  Routine,
  SavedRoutineSummary,
  Product,
  CompatibilityResult,
  KnowledgeGraph,
  RoutineHealth,
  RoutineInsights,
} from "./types";

const API_BASE = typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL ?? "";

const USER_MESSAGE = "Something went wrong. Please try again.";

function authHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function getProfile(): Promise<UserProfile> {
  const url = `${API_BASE}/api/profile`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Profile fetch failed", { url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<UserProfile>;
}

export async function getRoutine(): Promise<Routine> {
  const url = `${API_BASE}/api/routine`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    console.error("Routine fetch failed", { url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<Routine>;
}

export async function saveRoutine(routine: Routine): Promise<{ id?: string }> {
  const url = `${API_BASE}/api/routine`;
  const body: { id?: string; name?: string; am: unknown[]; pm: unknown[] } = {
    am: routine.am,
    pm: routine.pm,
  };
  if (routine.id) body.id = routine.id;
  if (routine.name) body.name = routine.name;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; details?: string }
    const base = data?.error ?? USER_MESSAGE
    const msg = data?.details ? `${base}: ${data.details}` : base
    throw new Error(msg)
  }
  return res.json() as Promise<{ id?: string }>;
}

export async function getRoutines(): Promise<SavedRoutineSummary[]> {
  const url = `${API_BASE}/api/routines`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    console.error("Routines list fetch failed", { url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<SavedRoutineSummary[]>;
}

export async function setCurrentRoutine(routineId: string): Promise<void> {
  const url = `${API_BASE}/api/routine/current`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ routineId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = (data as { error?: string }).error ?? USER_MESSAGE
    throw new Error(msg);
  }
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const url = `${API_BASE}/api/routine?id=${encodeURIComponent(routineId)}`;
  const res = await fetch(url, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = (data as { error?: string }).error ?? USER_MESSAGE
    throw new Error(msg);
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  const url = `${API_BASE}/api/products?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Product search failed", { url, status: res.status, query: query.slice(0, 50) });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<Product[]>;
}

export async function getCompatibility(productId: string): Promise<CompatibilityResult> {
  const url = `${API_BASE}/api/compatibility?productId=${encodeURIComponent(productId)}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    console.error("Compatibility fetch failed", { productId, url, status: res.status });
    throw new Error("We couldn't check this product right now. Please try again.");
  }
  return res.json() as Promise<CompatibilityResult>;
}

export async function getProduct(id: string): Promise<Product | null> {
  const url = `${API_BASE}/api/products?id=${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error("Product fetch failed", { id, url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<Product | null>;
}

export async function getKnowledgeGraph(): Promise<KnowledgeGraph> {
  const url = `${API_BASE}/api/graph`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Graph fetch failed", { url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<KnowledgeGraph>;
}

export async function getRoutineHealth(): Promise<RoutineHealth> {
  const url = `${API_BASE}/api/routine-health`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    console.error("Routine health fetch failed", { url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<RoutineHealth>;
}

export async function getRoutineInsights(): Promise<RoutineInsights> {
  const url = `${API_BASE}/api/routine-insights`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    console.error("Routine insights fetch failed", { url, status: res.status });
    throw new Error(USER_MESSAGE);
  }
  return res.json() as Promise<RoutineInsights>;
}

export async function getRoutineBootstrap(): Promise<{
  routine: Routine;
  health: RoutineHealth;
  insights: RoutineInsights;
  savedRoutines: SavedRoutineSummary[];
  scheduleEvents: unknown[];
}> {
  const url = `${API_BASE}/api/routine-bootstrap`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    console.error("Routine bootstrap fetch failed", { url, status: res.status });
    throw new Error("We couldn't load your routine data. Please try again.");
  }
  return res.json() as Promise<{
    routine: Routine;
    health: RoutineHealth;
    insights: RoutineInsights;
    savedRoutines: SavedRoutineSummary[];
    scheduleEvents: unknown[];
  }>;
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
}): Promise<{ events: unknown[] }> {
  const url = `${API_BASE}/api/routine-schedule/preview`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    console.error("Routine schedule preview failed", { url, status: res.status });
    throw new Error("We couldn't build your routine calendar preview. Please try again.");
  }
  return res.json() as Promise<{ events: unknown[] }>;
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
}): Promise<Blob> {
  const url = `${API_BASE}/api/routine-schedule/ics`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    console.error("Routine schedule ICS export failed", { url, status: res.status });
    throw new Error("We couldn't export your routine calendar. Please try again.");
  }
  return res.blob();
}

export async function downloadHistoryCsv(): Promise<Blob> {
  const url = `${API_BASE}/api/export/history`;
  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    console.error("History CSV export failed", { url, status: res.status });
    throw new Error("We couldn't export your history. Please try again.");
  }
  return res.blob();
}

/** Per-day calendar routine assignment: date (YYYY-MM-DD) -> routine id. */
export async function getScheduleOverrides(): Promise<Record<string, string>> {
  const url = `${API_BASE}/api/schedule-overrides`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    if (res.status === 401) return {}
    console.error("Schedule overrides fetch failed", { url, status: res.status })
    throw new Error("We couldn't load your calendar assignments.")
  }
  const data = (await res.json()) as { overrides?: Record<string, string> }
  return typeof data?.overrides === "object" && data.overrides !== null ? data.overrides : {}
}

export async function updateScheduleOverrides(overrides: Record<string, string>): Promise<void> {
  const url = `${API_BASE}/api/schedule-overrides`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ overrides }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data?.error ?? "Failed to save calendar assignments.")
  }
}

export async function getRoutineCalendarBootstrap(): Promise<{
  defaultRoutineId: string | null
  savedRoutines: SavedRoutineSummary[]
  overrides: Record<string, string>
}> {
  const url = `${API_BASE}/api/routine-calendar-bootstrap`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    if (res.status === 401) return { defaultRoutineId: null, savedRoutines: [], overrides: {} }
    console.error("Routine calendar bootstrap failed", { url, status: res.status })
    throw new Error("We couldn't load your calendar data. Please try again.")
  }
  return res.json() as Promise<{
    defaultRoutineId: string | null
    savedRoutines: SavedRoutineSummary[]
    overrides: Record<string, string>
  }>
}

export async function getRoutineIngredientIds(): Promise<{ ingredientIds: string[] }> {
  const url = `${API_BASE}/api/routine-ingredient-ids`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) {
    if (res.status === 401) return { ingredientIds: [] }
    console.error("Routine ingredient ids fetch failed", { url, status: res.status })
    throw new Error("We couldn't load your routine ingredients right now.")
  }
  return res.json() as Promise<{ ingredientIds: string[] }>
}

export interface ChatPayload {
  message: string;
  /** Optional: user's current routine so the assistant can answer "what's in my routine" */
  routine?: { am: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }>; pm: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }> };
}

export async function sendChatMessage(message: string, routine?: ChatPayload["routine"]): Promise<{ reply: string }> {
  const url = `${API_BASE}/api/chat`;
  const body: { message: string; routine?: ChatPayload["routine"] } = { message };
  if (routine) body.routine = routine;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : "Network error";
    console.error("Chat send failed: fetch threw", msg);
    throw new Error("Unable to reach the chat service. Check your connection and try again.");
  }
  if (!res.ok) {
    const errBody = await res.text();
    let serverMessage = USER_MESSAGE;
    try {
      const parsed = JSON.parse(errBody || "{}") as { error?: string };
      if (typeof parsed?.error === "string" && parsed.error) serverMessage = parsed.error;
      else if (errBody) serverMessage = errBody.slice(0, 200);
    } catch {
      if (errBody) serverMessage = errBody.slice(0, 200);
    }
    const bodyPreview = errBody ? errBody.slice(0, 300) + (errBody.length > 300 ? "…" : "") : "(empty)";
    console.error(`Chat send failed: status=${res.status} statusText=${res.statusText} body=${bodyPreview}`);
    throw new Error(serverMessage);
  }
  return res.json() as Promise<{ reply: string }>;
}
