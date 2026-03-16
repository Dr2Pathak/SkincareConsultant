/**
 * Central env checks for backend services. Use to validate config and return clear errors.
 * Does not expose secret values — only whether required vars are set.
 *
 * Feature → services:
 * - Auth, profiles, routines, products: Supabase
 * - Compatibility (avoid list + conflict detection): Supabase + Neo4j
 * - Routine health (exfoliation, retinoid, conflicts): Supabase + Neo4j
 * - Ingredient map (knowledge graph): Neo4j
 * - Chat (RAG): Gemini + Pinecone
 */

export type ServiceStatus = "ok" | "missing"

export interface EnvHealth {
  supabase: ServiceStatus
  neo4j: ServiceStatus
  pinecone: ServiceStatus
  gemini: ServiceStatus
  /** Human-readable hint when something is missing */
  message?: string
}

function isSet(v: string | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0
}

export function getEnvHealth(): EnvHealth {
  const supabase =
    isSet(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    isSet(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const neo4j =
    isSet(process.env.NEO4J_URI) &&
    isSet(process.env.NEO4J_USER) &&
    isSet(process.env.NEO4J_PASSWORD)
  const pinecone =
    isSet(process.env.PINECONE_API_KEY) &&
    (isSet(process.env.PINECONE_INDEX_HOST) || isSet(process.env.PINECONE_HOST))
  const gemini = isSet(process.env.GEMINI_API_KEY)

  const missing: string[] = []
  if (!supabase) missing.push("Supabase")
  if (!neo4j) missing.push("Neo4j")
  if (!pinecone) missing.push("Pinecone")
  if (!gemini) missing.push("Gemini")

  return {
    supabase: supabase ? "ok" : "missing",
    neo4j: neo4j ? "ok" : "missing",
    pinecone: pinecone ? "ok" : "missing",
    gemini: gemini ? "ok" : "missing",
    message: missing.length > 0 ? `Missing: ${missing.join(", ")}. See .env.example and docs/BACKEND_SETUP.md.` : undefined,
  }
}

/** Use in chat route: return error message if RAG (Gemini + Pinecone) is not configured. */
export function getChatEnvError(): string | null {
  if (!isSet(process.env.GEMINI_API_KEY)) return "GEMINI_API_KEY is not set. Add it to .env.local to enable chat."
  if (!isSet(process.env.PINECONE_API_KEY)) return "PINECONE_API_KEY is not set. Add it to .env.local to enable RAG."
  if (!isSet(process.env.PINECONE_INDEX_HOST) && !isSet(process.env.PINECONE_HOST)) return "PINECONE_INDEX_HOST or PINECONE_HOST is not set. Add it to .env.local to enable RAG."
  return null
}

/** Use in graph route: return error message if Neo4j is not configured. */
export function getNeo4jEnvError(): string | null {
  if (!isSet(process.env.NEO4J_URI)) return "NEO4J_URI is not set. Add it to .env.local to load the knowledge graph."
  if (!isSet(process.env.NEO4J_USER)) return "NEO4J_USER is not set. Add it to .env.local."
  if (!isSet(process.env.NEO4J_PASSWORD)) return "NEO4J_PASSWORD is not set. Add it to .env.local."
  return null
}
