import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST, DELETE } from "./route"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import { getSupabaseServer } from "@/lib/supabase/server"

vi.mock("@/lib/supabase/auth-server", () => ({ getUserFromRequest: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServer: vi.fn() }))

describe("GET /api/routine", () => {
  beforeEach(() => {
    vi.mocked(getUserFromRequest).mockResolvedValue(null)
  })

  it("returns default routine when not authenticated", async () => {
    vi.mocked(getSupabaseServer).mockReturnValue({ from: vi.fn() } as never)
    const res = await GET(new Request("http://localhost/api/routine"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty("am", [])
    expect(data).toHaveProperty("pm", [])
  })

  it("returns current routine when is_current row exists", async () => {
    const user = { id: "user-1" }
    vi.mocked(getUserFromRequest).mockResolvedValue(user as never)
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: { id: "r1", name: "Morning", am: [], pm: [] },
      }),
    }
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await GET(new Request("http://localhost/api/routine"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe("r1")
    expect(data.name).toBe("Morning")
  })

  it("returns default name when row.name is null", async () => {
    const user = { id: "user-1" }
    vi.mocked(getUserFromRequest).mockResolvedValue(user as never)
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({
        data: { id: "r1", name: null, am: [], pm: [] },
      }),
    }
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await GET(new Request("http://localhost/api/routine"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("My routine")
  })
})

describe("POST /api/routine", () => {
  beforeEach(() => {
    vi.mocked(getUserFromRequest).mockResolvedValue({ id: "user-1" } as never)
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(null)
    const res = await POST(
      new Request("http://localhost/api/routine", {
        method: "POST",
        body: JSON.stringify({ am: [], pm: [] }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("updates existing routine when id is provided", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "r1" } }),
      update: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValue(chain)
    chain.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await POST(
      new Request("http://localhost/api/routine", {
        method: "POST",
        body: JSON.stringify({ id: "r1", name: "Routine", am: [], pm: [] }),
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.id).toBe("r1")
  })

  it("creates new routine when id is not provided and sets it as current", async () => {
    const thenable = {
      then: (resolve: (v: { error: null }) => void) => {
        resolve({ error: null })
        return thenable
      },
      catch: () => thenable,
    }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-uuid" }, error: null }),
      update: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    Object.assign(chain, thenable)
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await POST(
      new Request("http://localhost/api/routine", {
        method: "POST",
        body: JSON.stringify({ name: "My routine", am: [], pm: [] }),
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.id).toBe("new-uuid")
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "My routine",
        am: [],
        pm: [],
        is_current: true,
      })
    )
  })

  it("normalizes routine name: custom name is stored", async () => {
    const thenable = {
      then: (resolve: (v: { error: null }) => void) => {
        resolve({ error: null })
        return thenable
      },
      catch: () => thenable,
    }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-uuid" }, error: null }),
      update: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    Object.assign(chain, thenable)
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await POST(
      new Request("http://localhost/api/routine", {
        method: "POST",
        body: JSON.stringify({ name: "  Evening Glow  ", am: [], pm: [] }),
      })
    )
    expect(res.status).toBe(200)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "Evening Glow",
        am: [],
        pm: [],
        is_current: true,
      })
    )
  })

  it("normalizes routine name: empty or whitespace becomes default", async () => {
    const thenable = {
      then: (resolve: (v: { error: null }) => void) => {
        resolve({ error: null })
        return thenable
      },
      catch: () => thenable,
    }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-uuid" }, error: null }),
      update: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    Object.assign(chain, thenable)
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await POST(
      new Request("http://localhost/api/routine", {
        method: "POST",
        body: JSON.stringify({ name: "   ", am: [], pm: [] }),
      })
    )
    expect(res.status).toBe(200)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My routine",
      })
    )
  })

  it("normalizes routine name: long name is capped at 64 chars", async () => {
    const longName = "a".repeat(100)
    const thenable = {
      then: (resolve: (v: { error: null }) => void) => {
        resolve({ error: null })
        return thenable
      },
      catch: () => thenable,
    }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-uuid" }, error: null }),
      update: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    Object.assign(chain, thenable)
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await POST(
      new Request("http://localhost/api/routine", {
        method: "POST",
        body: JSON.stringify({ name: longName, am: [], pm: [] }),
      })
    )
    expect(res.status).toBe(200)
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "a".repeat(64),
      })
    )
  })

  it("returns 500 with details when insert fails", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'column "is_current" of relation "routines" does not exist' },
      }),
    }
    chain.eq.mockReturnValue(chain)
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await POST(
      new Request("http://localhost/api/routine", {
        method: "POST",
        body: JSON.stringify({ am: [], pm: [] }),
      })
    )
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe("Failed to save routine")
    expect(data.details).toContain("is_current")
  })
})

describe("DELETE /api/routine", () => {
  beforeEach(() => {
    vi.mocked(getUserFromRequest).mockResolvedValue({ id: "user-1" } as never)
  })

  it("returns 400 when id is missing", async () => {
    vi.mocked(getSupabaseServer).mockReturnValue({ from: vi.fn() } as never)
    const res = await DELETE(new Request("http://localhost/api/routine"))
    expect(res.status).toBe(400)
  })

  it("returns 404 when routine not found", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }
    chain.eq.mockReturnValue(chain)
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await DELETE(new Request("http://localhost/api/routine?id=r1"))
    expect(res.status).toBe(404)
  })

  it("deletes routine and returns 200", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "r1", is_current: false } }),
      delete: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValue(chain)
    chain.delete.mockReturnValue(chain)
    vi.mocked(getSupabaseServer).mockReturnValue({ from: () => chain } as never)
    const res = await DELETE(new Request("http://localhost/api/routine?id=r1"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})
