import { describe, it, expect, vi, afterEach } from "vitest"
import { getEnvHealth, getChatEnvError, getNeo4jEnvError } from "./env"

describe("env", () => {
  const origEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...origEnv }
    vi.unstubAllEnvs()
  })

  describe("getEnvHealth", () => {
    it("returns ok for all services when env is set", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co")
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon")
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "role")
      vi.stubEnv("NEO4J_URI", "neo4j://localhost")
      vi.stubEnv("NEO4J_USER", "neo4j")
      vi.stubEnv("NEO4J_PASSWORD", "p")
      vi.stubEnv("PINECONE_API_KEY", "pk")
      vi.stubEnv("PINECONE_INDEX_HOST", "ix.pinecone.io")
      vi.stubEnv("GEMINI_API_KEY", "gk")

      const health = getEnvHealth()
      expect(health.supabase).toBe("ok")
      expect(health.neo4j).toBe("ok")
      expect(health.pinecone).toBe("ok")
      expect(health.gemini).toBe("ok")
      expect(health.message).toBeUndefined()
    })

    it("returns missing when vars are unset", () => {
      vi.stubEnv("GEMINI_API_KEY", "")
      vi.stubEnv("PINECONE_API_KEY", "")
      vi.stubEnv("PINECONE_INDEX_HOST", "")
      vi.stubEnv("PINECONE_HOST", "")
      vi.stubEnv("NEO4J_URI", "")

      const health = getEnvHealth()
      expect(health.gemini).toBe("missing")
      expect(health.pinecone).toBe("missing")
      expect(health.neo4j).toBe("missing")
      expect(health.message).toMatch(/Missing:/)
    })

    it("accepts PINECONE_HOST as alternative to PINECONE_INDEX_HOST for pinecone", () => {
      vi.stubEnv("PINECONE_INDEX_HOST", "")
      vi.stubEnv("PINECONE_HOST", "host.pinecone.io")
      vi.stubEnv("PINECONE_API_KEY", "pk")

      const health = getEnvHealth()
      expect(health.pinecone).toBe("ok")
    })
  })

  describe("getChatEnvError", () => {
    it("returns null when Gemini and Pinecone are set", () => {
      vi.stubEnv("GEMINI_API_KEY", "gk")
      vi.stubEnv("PINECONE_API_KEY", "pk")
      vi.stubEnv("PINECONE_INDEX_HOST", "ix.io")

      expect(getChatEnvError()).toBeNull()
    })

    it("returns message when GEMINI_API_KEY is missing", () => {
      vi.stubEnv("GEMINI_API_KEY", "")
      vi.stubEnv("PINECONE_API_KEY", "pk")
      vi.stubEnv("PINECONE_INDEX_HOST", "ix.io")

      const err = getChatEnvError()
      expect(err).toMatch(/GEMINI_API_KEY/)
    })

    it("returns message when PINECONE_INDEX_HOST and PINECONE_HOST are missing", () => {
      vi.stubEnv("GEMINI_API_KEY", "gk")
      vi.stubEnv("PINECONE_API_KEY", "pk")
      vi.stubEnv("PINECONE_INDEX_HOST", "")
      vi.stubEnv("PINECONE_HOST", "")

      const err = getChatEnvError()
      expect(err).toMatch(/PINECONE_INDEX_HOST|PINECONE_HOST/)
    })
  })

  describe("getNeo4jEnvError", () => {
    it("returns null when NEO4J_URI, USER, PASSWORD are set", () => {
      vi.stubEnv("NEO4J_URI", "neo4j://x")
      vi.stubEnv("NEO4J_USER", "u")
      vi.stubEnv("NEO4J_PASSWORD", "p")

      expect(getNeo4jEnvError()).toBeNull()
    })

    it("returns message when NEO4J_URI is missing", () => {
      vi.stubEnv("NEO4J_URI", "")
      vi.stubEnv("NEO4J_USER", "u")
      vi.stubEnv("NEO4J_PASSWORD", "p")

      const err = getNeo4jEnvError()
      expect(err).toMatch(/NEO4J_URI/)
    })
  })
})
