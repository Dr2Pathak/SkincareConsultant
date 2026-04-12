/**
 * POST /api/chat — RAG (Pinecone) + knowledge graph (Neo4j) + user's routine.
 * RAG = semantic search over ingested ingredient/product chunks. It does NOT include the graph.
 * We add Neo4j context (conflicts, helps for routine ingredients) so suggestions are specific.
 */

import { NextResponse } from "next/server"
import { getChatEnvError } from "@/lib/env"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { embedTexts, generateChatReply } from "@/lib/gemini"
import { getRoutineKnowledgeContext } from "@/lib/chat-context"
import type { RagMetadata } from "@/lib/rag-types"

const TOP_K = 8
const ROUTINE_RAG_TOP_K = 5
const CACHE_TTL_MS = 5 * 60 * 1000
const SYSTEM_PREFIX = `You are SkinSafe, a skincare guidance assistant. Answer using the retrieved RAG context, the knowledge-graph context (conflicts/helps for the user's ingredients), and the user's routine.
Be concise by default: about 2–4 short paragraphs or a few tight bullet lists unless the user explicitly asks for depth. Avoid repeating the same point. Do not diagnose or treat; educational and guidance only. Recommend patch testing.`

type RoutineForPrompt = {
  am: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }>
  pm: Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }>
}

function formatRoutineForPrompt(routine: RoutineForPrompt): string {
  const fmt = (steps: unknown[], label: string) => {
    const list = (steps as Array<{ label?: string; productId?: string; product?: { name: string; brand: string } }>)
      .map((s, i) => {
        const name = s.product ? `${s.product.name} (${s.product.brand})` : s.label ?? `Step ${i + 1}`
        return `  ${i + 1}. ${name}`
      })
    return `${label}:\n${list.length ? list.join("\n") : "  (none)"}`
  }
  return [fmt(routine.am, "Morning (AM)"), fmt(routine.pm, "Evening (PM)")].join("\n\n")
}

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase()
}

function makeRoutineHash(routine: RoutineForPrompt | null): string {
  if (!routine) return ""
  const ids = routine.am
    .concat(routine.pm)
    .map((s) => s.productId)
    .filter((id): id is string => !!id)
    .sort()
  return ids.join("|")
}

type CacheEntry = {
  createdAt: number
  context: string
}

const contextCache = new Map<string, CacheEntry>()
const knowledgeContextCache = new Map<string, CacheEntry>()

function getCacheKey(message: string, routine: RoutineForPrompt | null): string {
  return `${normalizeMessage(message)}::${makeRoutineHash(routine)}`
}

function getCachedContext(key: string): string | null {
  const entry = contextCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    contextCache.delete(key)
    return null
  }
  return entry.context
}

function setCachedContext(key: string, context: string): void {
  contextCache.set(key, { createdAt: Date.now(), context })
}

function getKnowledgeCacheKey(routine: RoutineForPrompt | null): string | null {
  const routineHash = makeRoutineHash(routine)
  if (!routineHash) return null
  return `knowledge::${routineHash}`
}

function getCachedKnowledgeContext(key: string): string | null {
  const entry = knowledgeContextCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    knowledgeContextCache.delete(key)
    return null
  }
  return entry.context
}

function setCachedKnowledgeContext(key: string, context: string): void {
  knowledgeContextCache.set(key, { createdAt: Date.now(), context })
}

const SEMANTIC_SIM_THRESHOLD = 0.92
const SEMANTIC_MAX_PER_META = 16

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

type SemanticRagEntry = { embedding: number[]; context: string; createdAt: number }
const semanticRagByMeta = new Map<string, SemanticRagEntry[]>()

function semanticMetaKey(queryType: string | undefined, routine: RoutineForPrompt | null): string {
  const qt =
    queryType === "ingredient" || queryType === "product" || queryType === "routine" ? queryType : "default"
  return `${qt}::${makeRoutineHash(routine)}`
}

function takeSemanticRagContext(metaKey: string, embedding: number[]): string | null {
  const list = semanticRagByMeta.get(metaKey)
  if (!list?.length) return null
  const now = Date.now()
  const fresh = list.filter((e) => now - e.createdAt <= CACHE_TTL_MS)
  if (fresh.length !== list.length) semanticRagByMeta.set(metaKey, fresh)
  let bestScore = SEMANTIC_SIM_THRESHOLD
  let bestCtx: string | null = null
  for (const e of fresh) {
    const s = cosineSimilarity(embedding, e.embedding)
    if (s >= bestScore) {
      bestScore = s
      bestCtx = e.context
    }
  }
  return bestCtx
}

function recordSemanticRag(metaKey: string, embedding: number[], context: string): void {
  if (!context.trim()) return
  const now = Date.now()
  const prev = (semanticRagByMeta.get(metaKey) ?? []).filter((e) => now - e.createdAt <= CACHE_TTL_MS)
  prev.push({ embedding: [...embedding], context, createdAt: now })
  while (prev.length > SEMANTIC_MAX_PER_META) prev.shift()
  semanticRagByMeta.set(metaKey, prev)
}

function getPineconeFilter(queryType?: string): Record<string, unknown> | undefined {
  switch (queryType) {
    case "ingredient":
      return { type: { $in: ["ingredient", "guidance"] } }
    case "product":
      return { type: { $in: ["product", "guidance"] } }
    case "routine":
      return { type: { $in: ["ingredient", "product", "guidance"] } }
    default:
      return undefined
  }
}

export async function POST(request: Request) {
  const envError = getChatEnvError()
  if (envError) {
    return NextResponse.json({ error: envError }, { status: 503 })
  }

  try {
    const enableTiming = process.env.NODE_ENV === "development"
    const requestStart = enableTiming ? Date.now() : 0

    const body = await request.json().catch(() => ({}))
    const message = typeof body.message === "string" ? body.message.trim() : ""
    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 })
    }

    const routine = body.routine && Array.isArray(body.routine.am) && Array.isArray(body.routine.pm)
      ? (body.routine as RoutineForPrompt)
      : null
    const routineContext = routine ? `\n\nUser's current routine:\n${formatRoutineForPrompt(routine)}` : ""

    const productIds = routine
      ? (routine.am as Array<{ productId?: string }>)
          .concat(routine.pm as Array<{ productId?: string }>)
          .map((s) => s.productId)
          .filter((id): id is string => !!id)
      : []
    const cacheKey = getCacheKey(message, routine)
    const knowledgeCacheKey = getKnowledgeCacheKey(routine)
    const cachedKnowledgeContext = knowledgeCacheKey ? getCachedKnowledgeContext(knowledgeCacheKey) : null

    const cachedContext = getCachedContext(cacheKey)
    const queryTypeRaw = typeof body.queryType === "string" ? body.queryType : undefined
    const pineconeFilter = getPineconeFilter(queryTypeRaw)
    const semanticKey = semanticMetaKey(queryTypeRaw, routine)

    const pineconePromise: Promise<string> = cachedContext !== null
      ? Promise.resolve(cachedContext)
      : (async () => {
          const t0 = enableTiming ? Date.now() : 0
          const [embedding] = await embedTexts([message])
          const t1 = enableTiming ? Date.now() : 0

          const semanticHit = takeSemanticRagContext(semanticKey, embedding)
          if (semanticHit) {
            setCachedContext(cacheKey, semanticHit)
            if (enableTiming) {
              console.log("[chat] pinecone", {
                embedMs: t1 - t0,
                semanticReuse: true,
                builtContextChars: semanticHit.length,
              })
            }
            return semanticHit
          }

          const pc = getPineconeClient()
          const host = getPineconeIndexHost()
          const index = pc.index({ host })

          const queryResult = await index.query({
            vector: embedding,
            topK: TOP_K,
            includeMetadata: true,
            ...(pineconeFilter ? { filter: pineconeFilter } : {}),
          })
          const t2 = enableTiming ? Date.now() : 0

          let matches =
            (queryResult as { matches?: Array<{ id?: string; metadata?: RagMetadata }> }).matches ?? []

          if (routine && productIds.length > 0) {
            const routineProductNames = routine.am
              .concat(routine.pm)
              .map((s) => s.product?.name)
              .filter(Boolean) as string[]
            if (routineProductNames.length > 0) {
              const routineQuery = `skincare routine ingredients products: ${routineProductNames
                .slice(0, 10)
                .join(", ")}`
              const [routineEmbedding] = await embedTexts([routineQuery])
              const routineResult = await index.query({
                vector: routineEmbedding,
                topK: ROUTINE_RAG_TOP_K,
                includeMetadata: true,
                ...(pineconeFilter ? { filter: pineconeFilter } : {}),
              })
              const routineMatches =
                (routineResult as { matches?: Array<{ id?: string; metadata?: RagMetadata }> }).matches ?? []
              const seen = new Set(matches.map((m) => m.id))
              for (const m of routineMatches) {
                if (m.id && !seen.has(m.id)) {
                  seen.add(m.id)
                  matches = [...matches, m]
                }
              }
            }
          }

          const builtContext = matches
            .map((h) => {
              const meta = (h.metadata ?? {}) as RagMetadata
              const type = meta.type ?? "ingredient"
              const name = meta.name ?? ""
              const text = (meta.text ?? "") as string
              const header = `[${type}${name ? `: ${name}` : ""}]`
              const body = text.trim()
              return body ? `${header}\n${body}` : header
            })
            .filter((s) => s.length > 0)
            .join("\n\n")

          if (builtContext) {
            setCachedContext(cacheKey, builtContext)
            recordSemanticRag(semanticKey, embedding, builtContext)
          }

          if (enableTiming) {
            console.log("[chat] pinecone", {
              embedMs: t1 - t0,
              queryMs: t2 - t1,
              exactContextCached: false,
              semanticReuse: false,
              builtContextChars: builtContext.length,
            })
          }

          return builtContext
        })()

    const knowledgePromise: Promise<string> = cachedKnowledgeContext !== null
      ? Promise.resolve(cachedKnowledgeContext)
      : (async () => {
          const t0 = enableTiming ? Date.now() : 0
          if (productIds.length === 0 || !knowledgeCacheKey) return ""
          const knowledgeContext = await getRoutineKnowledgeContext(productIds)
          const t1 = enableTiming ? Date.now() : 0
          // Cache even empty string to avoid repeated Neo4j work for "no hits".
          setCachedKnowledgeContext(knowledgeCacheKey, knowledgeContext)
          if (enableTiming) {
            console.log("[chat] neo4j knowledge", {
              neo4jMs: t1 - t0,
              cached: false,
              knowledgeChars: knowledgeContext.length,
            })
          }
          return knowledgeContext
        })()

    const [context, knowledgeContext] = await Promise.all([pineconePromise, knowledgePromise])

    const systemPrompt = [
      SYSTEM_PREFIX,
      routineContext,
      knowledgeContext,
      context
        ? `\n\nRetrieved RAG context:\n${context.slice(0, 8000)}`
        : "\n\nNo specific RAG context was retrieved; use the knowledge-graph and routine above, and general skincare knowledge.",
    ].join("")
    const reply = await generateChatReply(systemPrompt, message, { maxOutputTokens: 4096 })

    if (enableTiming) {
      console.log("[chat] totalMs", { total: Date.now() - requestStart })
    }
    return NextResponse.json({ reply })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    const stack = err instanceof Error ? err.stack : undefined
    console.error("POST /api/chat failed", message, stack ?? "")
    // Surface the real error to the client so the user can fix config (e.g. wrong key, missing env)
    const safeMessage = message.slice(0, 500)
    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
}
