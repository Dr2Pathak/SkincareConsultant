import { describe, it, expect } from "vitest"
import { GET } from "./route"

describe("GET /api/health", () => {
  it("returns services status and optional message", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty("services")
    expect(data.services).toHaveProperty("supabase")
    expect(data.services).toHaveProperty("neo4j")
    expect(data.services).toHaveProperty("pinecone")
    expect(data.services).toHaveProperty("gemini")
    const statuses = ["ok", "missing"]
    expect(statuses).toContain(data.services.supabase)
    expect(statuses).toContain(data.services.neo4j)
    expect(statuses).toContain(data.services.pinecone)
    expect(statuses).toContain(data.services.gemini)
    if (data.message) {
      expect(typeof data.message).toBe("string")
    }
  })
})
