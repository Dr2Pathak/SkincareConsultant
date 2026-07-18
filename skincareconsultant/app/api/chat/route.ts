/**
 * POST /api/chat — RAG (Pinecone) + knowledge graph (Neo4j) + user's routine.
 * Distributed cache (Redis/memory), auth, rate limiting, tracing, resilience.
 */

import { NextResponse } from "next/server"
import { getChatEnvError } from "@/lib/env"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { embedTexts, generateChatReply } from "@/lib/gemini"
import { getRoutineKnowledgeContext } from "@/lib/chat-context"
import { getUserFromRequest } from "@/lib/supabase/auth-server"
import type { RagMetadata } from "@/lib/rag-types"
import {
  getExactContext,
  setExactContext,
  getKnowledgeContext,
  setKnowledgeContext,
  takeSemanticContext,
  recordSemanticContext,
  resetChatCachesForTests as resetCaches,
  userScopeFromId,
  cacheBackend,
} from "@/lib/cache/chat-cache"
import { checkChatRateLimit } from "@/lib/rate-limit"
import { withSpan } from "@/lib/telemetry/tracing"
import { withTimeout, withRetry, getCircuitBreaker } from "@/lib/resilience"

const TOP_K = 8
const ROUTINE_RAG_TOP_K = 5
const EMBED_TIMEOUT_MS = 15_000
const PINECONE_TIMEOUT_MS = 10_000
const NEO4J_TIMEOUT_MS = 10_000
const LLM_TIMEOUT_MS = 45_000

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

function getCacheKey(message: string, routine: RoutineForPrompt | null): string {
  return `${normalizeMessage(message)}::${makeRoutineHash(routine)}`
}

function getKnowledgeCacheKey(routine: RoutineForPrompt | null): string | null {
  const routineHash = makeRoutineHash(routine)
  if (!routineHash) return null
  return `knowledge::${routineHash}`
}

function semanticMetaKey(queryType: string | undefined, routine: RoutineForPrompt | null): string {
  const qt =
    queryType === "ingredient" || queryType === "product" || queryType === "routine" ? queryType : "default"
  return `${qt}::${makeRoutineHash(routine)}`
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

/** Clears RAG caches (metrics tests). */
export async function resetChatCachesForTests(): Promise<void> {
  await resetCaches()
}

export async function POST(request: Request) {
  return withSpan("chat.request", { route: "/api/chat" }, async (rootSpan) => {
    const envError = getChatEnvError()
    if (envError) {
      return NextResponse.json({ error: envError }, { status: 503 })
    }

    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 })
    }

    const rate = await checkChatRateLimit(user.id)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many chat requests. Please wait a minute and try again." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Limit": String(rate.limit) } },
      )
    }

    try {
      const body = await request.json().catch(() => ({}))
      const message = typeof body.message === "string" ? body.message.trim() : ""
      if (!message) {
        return NextResponse.json({ error: "message required" }, { status: 400 })
      }

      const userScope = userScopeFromId(user.id)
      rootSpan.setAttribute("cache.backend", cacheBackend())
      rootSpan.setAttribute("user.id", user.id)

      const routine =
        body.routine && Array.isArray(body.routine.am) && Array.isArray(body.routine.pm)
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
      const queryTypeRaw = typeof body.queryType === "string" ? body.queryType : undefined
      const pineconeFilter = getPineconeFilter(queryTypeRaw)
      const semanticKey = semanticMetaKey(queryTypeRaw, routine)

      const cachedContext = await getExactContext(userScope, cacheKey)
      const cachedKnowledgeContext =
        knowledgeCacheKey ? await getKnowledgeContext(userScope, knowledgeCacheKey) : null

      const pineconeBreaker = getCircuitBreaker("pinecone")
      const neo4jBreaker = getCircuitBreaker("neo4j")

      const pineconePromise: Promise<string> =
        cachedContext !== null
          ? (rootSpan.setAttribute("cache.rag.tier", "exact"), Promise.resolve(cachedContext))
          : withSpan("chat.rag.retrieve", {}, async (ragSpan) => {
              const [embedding] = await withRetry(
                () => withTimeout(embedTexts([message]), EMBED_TIMEOUT_MS, "embed"),
                { label: "embed" },
              )

              const semanticHit = await takeSemanticContext(userScope, semanticKey, embedding)
              if (semanticHit) {
                ragSpan.setAttribute("cache.rag.tier", "semantic")
                rootSpan.setAttribute("cache.rag.tier", "semantic")
                await setExactContext(userScope, cacheKey, semanticHit)
                return semanticHit
              }

              ragSpan.setAttribute("cache.rag.tier", "miss")

              const builtContext = await pineconeBreaker.exec(() =>
                withRetry(
                  () =>
                    withTimeout(
                      (async () => {
                        const pc = getPineconeClient()
                        const host = getPineconeIndexHost()
                        const index = pc.index({ host })

                        const queryResult = await index.query({
                          vector: embedding,
                          topK: TOP_K,
                          includeMetadata: true,
                          ...(pineconeFilter ? { filter: pineconeFilter } : {}),
                        })

                        let matches =
                          (queryResult as { matches?: Array<{ id?: string; metadata?: RagMetadata }> })
                            .matches ?? []

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
                              (routineResult as { matches?: Array<{ id?: string; metadata?: RagMetadata }> })
                                .matches ?? []
                            const seen = new Set(matches.map((m) => m.id))
                            for (const m of routineMatches) {
                              if (m.id && !seen.has(m.id)) {
                                seen.add(m.id)
                                matches = [...matches, m]
                              }
                            }
                          }
                        }

                        return matches
                          .map((h) => {
                            const meta = (h.metadata ?? {}) as RagMetadata
                            const type = meta.type ?? "ingredient"
                            const name = meta.name ?? ""
                            const text = (meta.text ?? "") as string
                            const header = `[${type}${name ? `: ${name}` : ""}]`
                            const chunkBody = text.trim()
                            return chunkBody ? `${header}\n${chunkBody}` : header
                          })
                          .filter((s) => s.length > 0)
                          .join("\n\n")
                      })(),
                      PINECONE_TIMEOUT_MS,
                      "pinecone",
                    ),
                  { label: "pinecone" },
                ),
              )

              if (builtContext) {
                await setExactContext(userScope, cacheKey, builtContext)
                await recordSemanticContext(userScope, semanticKey, embedding, builtContext)
              }
              rootSpan.setAttribute("cache.rag.tier", "miss")
              return builtContext
            })

      const knowledgePromise: Promise<string> =
        cachedKnowledgeContext !== null
          ? Promise.resolve(cachedKnowledgeContext)
          : withSpan("chat.neo4j.knowledge", {}, async () => {
              if (productIds.length === 0 || !knowledgeCacheKey) return ""
              const knowledgeContext = await neo4jBreaker.exec(() =>
                withRetry(
                  () =>
                    withTimeout(getRoutineKnowledgeContext(productIds), NEO4J_TIMEOUT_MS, "neo4j"),
                  { label: "neo4j" },
                ),
              )
              await setKnowledgeContext(userScope, knowledgeCacheKey, knowledgeContext)
              return knowledgeContext
            })

      const [context, knowledgeContext] = await Promise.all([pineconePromise, knowledgePromise])

      const systemPrompt = [
        SYSTEM_PREFIX,
        routineContext,
        knowledgeContext,
        context
          ? `\n\nRetrieved RAG context:\n${context.slice(0, 8000)}`
          : "\n\nNo specific RAG context was retrieved; use the knowledge-graph and routine above, and general skincare knowledge.",
      ].join("")

      const reply = await withSpan("chat.llm.generate", {}, async () =>
        withRetry(
          () =>
            withTimeout(generateChatReply(systemPrompt, message, { maxOutputTokens: 4096 }), LLM_TIMEOUT_MS, "llm"),
          { label: "llm" },
        ),
      )

      return NextResponse.json(
        { reply },
        {
          headers: {
            "X-RateLimit-Remaining": String(rate.remaining),
            "X-Cache-Backend": cacheBackend(),
          },
        },
      )
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "Unknown error"
      const stack = err instanceof Error ? err.stack : undefined
      console.error("POST /api/chat failed", { userId: user.id, error: errMessage, stack: stack ?? "" })
      return NextResponse.json({ error: errMessage.slice(0, 500) }, { status: 500 })
    }
  })
}
