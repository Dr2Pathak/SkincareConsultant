/**
 * Three-tier chat RAG cache (exact, semantic, knowledge) with user-scoped Redis keys.
 */

import { cacheGet, cacheSet, cacheIncr, cacheClearForTests, cacheBackend } from "./redis"

export const CACHE_TTL_SECONDS = 5 * 60
export const SEMANTIC_SIM_THRESHOLD = 0.92
export const SEMANTIC_MAX_PER_META = 16

export type CacheTier = "exact" | "semantic" | "knowledge" | "miss"

type SemanticRagEntry = { embedding: number[]; context: string; createdAt: number }

function prefix(userScope: string, segment: string): string {
  return `skinsafe:${userScope}:${segment}`
}

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

export async function recordCacheMetric(tier: CacheTier, hit: boolean): Promise<void> {
  const suffix = hit ? "hits" : "misses"
  await cacheIncr(`skinsafe:metrics:cache:${tier}:${suffix}`)
}

export async function getCacheHitRates(): Promise<Record<string, { hits: number; misses: number }>> {
  const tiers: CacheTier[] = ["exact", "semantic", "knowledge"]
  const out: Record<string, { hits: number; misses: number }> = {}
  for (const tier of tiers) {
    const hits = Number.parseInt((await cacheGet(`skinsafe:metrics:cache:${tier}:hits`)) ?? "0", 10)
    const misses = Number.parseInt((await cacheGet(`skinsafe:metrics:cache:${tier}:misses`)) ?? "0", 10)
    out[tier] = { hits, misses }
  }
  return out
}

export async function getExactContext(userScope: string, cacheKey: string): Promise<string | null> {
  const value = await cacheGet(prefix(userScope, `exact:${cacheKey}`))
  if (value !== null) {
    await recordCacheMetric("exact", true)
    return value
  }
  await recordCacheMetric("exact", false)
  return null
}

export async function setExactContext(userScope: string, cacheKey: string, context: string): Promise<void> {
  if (!context.trim()) return
  await cacheSet(prefix(userScope, `exact:${cacheKey}`), context, CACHE_TTL_SECONDS)
}

export async function getKnowledgeContext(userScope: string, knowledgeKey: string): Promise<string | null> {
  const value = await cacheGet(prefix(userScope, `knowledge:${knowledgeKey}`))
  if (value !== null) {
    await recordCacheMetric("knowledge", true)
    return value
  }
  await recordCacheMetric("knowledge", false)
  return null
}

export async function setKnowledgeContext(
  userScope: string,
  knowledgeKey: string,
  context: string,
): Promise<void> {
  await cacheSet(prefix(userScope, `knowledge:${knowledgeKey}`), context, CACHE_TTL_SECONDS)
}

export async function takeSemanticContext(
  userScope: string,
  metaKey: string,
  embedding: number[],
): Promise<string | null> {
  const raw = await cacheGet(prefix(userScope, `semantic:${metaKey}`))
  if (!raw) {
    await recordCacheMetric("semantic", false)
    return null
  }
  let list: SemanticRagEntry[]
  try {
    list = JSON.parse(raw) as SemanticRagEntry[]
  } catch {
    await recordCacheMetric("semantic", false)
    return null
  }
  const now = Date.now()
  const fresh = list.filter((e) => now - e.createdAt <= CACHE_TTL_SECONDS * 1000)
  let bestScore = SEMANTIC_SIM_THRESHOLD
  let bestCtx: string | null = null
  for (const e of fresh) {
    const s = cosineSimilarity(embedding, e.embedding)
    if (s >= bestScore) {
      bestScore = s
      bestCtx = e.context
    }
  }
  if (bestCtx) {
    await recordCacheMetric("semantic", true)
    return bestCtx
  }
  await recordCacheMetric("semantic", false)
  return null
}

export async function recordSemanticContext(
  userScope: string,
  metaKey: string,
  embedding: number[],
  context: string,
): Promise<void> {
  if (!context.trim()) return
  const key = prefix(userScope, `semantic:${metaKey}`)
  const raw = await cacheGet(key)
  const now = Date.now()
  let prev: SemanticRagEntry[] = []
  if (raw) {
    try {
      prev = (JSON.parse(raw) as SemanticRagEntry[]).filter(
        (e) => now - e.createdAt <= CACHE_TTL_SECONDS * 1000,
      )
    } catch {
      prev = []
    }
  }
  prev.push({ embedding: [...embedding], context, createdAt: now })
  while (prev.length > SEMANTIC_MAX_PER_META) prev.shift()
  await cacheSet(key, JSON.stringify(prev), CACHE_TTL_SECONDS)
}

/** Clears cache state (tests). */
export async function resetChatCachesForTests(): Promise<void> {
  await cacheClearForTests()
}

export function userScopeFromId(userId: string | null | undefined): string {
  return userId?.trim() ? `user:${userId}` : "anonymous"
}

export { cacheBackend }
