import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "./route"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getSupabaseServer } from "@/lib/supabase/server"

vi.mock("@/lib/supabase/auth-server", () => ({ getUserFromRequest: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServer: vi.fn() }))

describe("GET /api/routine-calendar-bootstrap", () => {
  beforeEach(() => {
    vi.mocked(getUserFromRequest).mockResolvedValue(null as never)
  })

  it("returns empty payload when unauthenticated", async () => {
    const res = await GET(new Request("http://localhost/api/routine-calendar-bootstrap"))
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      defaultRoutineId: string | null
      savedRoutines: unknown[]
      overrides: Record<string, string>
    }
    expect(data.defaultRoutineId).toBeNull()
    expect(Array.isArray(data.savedRoutines)).toBe(true)
    expect(data.savedRoutines).toHaveLength(0)
    expect(data.overrides).toEqual({})
  })

  it("returns saved routines, overrides, and default routine id", async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue({ id: "user-1" } as never)

    const routineRows = [
      { id: "r-new", name: "New", am: [], pm: [], is_current: false, updated_at: "2024-01-02" },
      { id: "r-current", name: "Current", am: [], pm: [], is_current: true, updated_at: "2024-01-03" },
    ]
    const profileRow = { schedule_overrides: { "2024-01-10": "r-current" } }

    const routinesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: routineRows }),
    }
    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: profileRow }),
    }

    vi.mocked(getSupabaseServer).mockReturnValue({
      from: (table: string) => {
        if (table === "routines") return routinesChain as never
        if (table === "profiles") return profilesChain as never
        throw new Error(`Unexpected table: ${table}`)
      },
    } as never)

    const res = await GET(new Request("http://localhost/api/routine-calendar-bootstrap"))
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      defaultRoutineId: string | null
      savedRoutines: Array<{ id: string; is_current: boolean; name: string }>
      overrides: Record<string, string>
    }

    expect(data.defaultRoutineId).toBe("r-current")
    expect(data.savedRoutines).toHaveLength(2)
    expect(data.savedRoutines.some((r) => r.is_current && r.id === "r-current")).toBe(true)
    expect(data.overrides).toEqual({ "2024-01-10": "r-current" })
  })
})

