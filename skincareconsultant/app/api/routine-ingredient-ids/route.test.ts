import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "./route"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getSupabaseServer } from "@/lib/supabase/server"

vi.mock("@/lib/supabase/auth-server", () => ({ getUserFromRequest: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServer: vi.fn() }))

describe("GET /api/routine-ingredient-ids", () => {
  beforeEach(() => {
    vi.mocked(getUserFromRequest).mockResolvedValue(null as never)
  })

  it("returns empty when unauthenticated", async () => {
    const res = await GET(new Request("http://localhost/api/routine-ingredient-ids"))
    expect(res.status).toBe(200)
    const data = (await res.json()) as { ingredientIds: string[] }
    expect(data.ingredientIds).toEqual([])
  })

  it("returns normalized ingredient ids from routine product INCI lists", async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue({ id: "user-1" } as never)

    const currentRoutineRow = {
      am: [{ productId: "p1" }, { productId: "p2" }],
      pm: [],
    }
    const productsRows = [
      { id: "p1", inci_list: ["Niacinamide", "Alcohol Denat"] },
      { id: "p2", inci_list: ["Retinol"] },
    ]

    const routinesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: currentRoutineRow }),
    }
    const productsChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: productsRows }),
    }

    vi.mocked(getSupabaseServer).mockReturnValue({
      from: (table: string) => {
        if (table === "routines") return routinesChain as never
        if (table === "products") return productsChain as never
        throw new Error(`Unexpected table: ${table}`)
      },
    } as never)

    const res = await GET(new Request("http://localhost/api/routine-ingredient-ids"))
    expect(res.status).toBe(200)
    const data = (await res.json()) as { ingredientIds: string[] }

    // Based on normalizeInciId: lower + whitespace->- + remove invalid chars
    expect(data.ingredientIds).toContain("niacinamide")
    expect(data.ingredientIds).toContain("alcohol-denat")
    expect(data.ingredientIds).toContain("retinol")
  })
})

