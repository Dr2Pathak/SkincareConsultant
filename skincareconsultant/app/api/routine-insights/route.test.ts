import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "./route"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getRoutineKnowledgeInsights } from "@/lib/routine-knowledge"

vi.mock("@/lib/supabase/auth-server", () => ({ getUserFromRequest: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServer: vi.fn() }))
vi.mock("@/lib/routine-knowledge", () => ({ getRoutineKnowledgeInsights: vi.fn() }))

describe("GET /api/routine-insights", () => {
  beforeEach(() => {
    vi.mocked(getUserFromRequest).mockResolvedValue(null)
    vi.mocked(getRoutineKnowledgeInsights).mockResolvedValue({ conflicts: [], helps: [] })
  })

  it("returns 200 with conflicts and helps arrays", async () => {
    const res = await GET(new Request("http://localhost/api/routine-insights"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty("conflicts")
    expect(data).toHaveProperty("helps")
    expect(Array.isArray(data.conflicts)).toBe(true)
    expect(Array.isArray(data.helps)).toBe(true)
    expect(data.hasRoutineProducts).toBe(false)
  })

  it("returns hasRoutineProducts true when routine has products", async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue({ id: "user-1" } as never)
    vi.mocked(getRoutineKnowledgeInsights).mockResolvedValue({
      conflicts: [{ aLabel: "A", bLabel: "B" }],
      helps: [],
    })
    const getSupabaseServer = (await import("@/lib/supabase/server")).getSupabaseServer
    vi.mocked(getSupabaseServer).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { am: [{ productId: "p1" }], pm: [] },
      }),
    } as never)
    const res = await GET(new Request("http://localhost/api/routine-insights"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.hasRoutineProducts).toBe(true)
    expect(data.conflicts).toHaveLength(1)
    expect(data.conflicts[0]).toEqual({ aLabel: "A", bLabel: "B" })
  })
})
