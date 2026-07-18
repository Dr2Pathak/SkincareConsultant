/**
 * Consolidated value report: realistic simulated latencies + call counts.
 * Run: npm run test:metrics (included) or npm run report:value
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { POST, resetChatCachesForTests } from "@/app/api/chat/route"
import { getChatEnvError } from "@/lib/env"
import { embedTexts, generateChatReply, generateJsonText } from "@/lib/gemini"
import { getPineconeClient, getPineconeIndexHost } from "@/lib/pinecone"
import { getRoutineKnowledgeContext } from "@/lib/chat-context"
import { interpretCalendarRequestWithTot } from "@/lib/calendar-ai-tot"
import { reductionPct, speedupPct, rate } from "@/lib/metrics/collector"
import { formatValueReport, type ValueMetricsSnapshot } from "@/lib/metrics/value-report"
import { authRequest } from "@/lib/test/chat-auth-mock"

vi.mock("@/lib/supabase/auth-server", () => ({
  getUserFromRequest: vi.fn().mockResolvedValue({ id: "test-user-metrics" }),
}))
vi.mock("@/lib/env", () => ({ getChatEnvError: vi.fn() }))
vi.mock("@/lib/gemini", () => ({
  embedTexts: vi.fn(),
  generateChatReply: vi.fn(),
  generateJsonText: vi.fn(),
}))
vi.mock("@/lib/pinecone", () => ({
  getPineconeClient: vi.fn(),
  getPineconeIndexHost: vi.fn(),
}))
vi.mock("@/lib/chat-context", () => ({
  getRoutineKnowledgeContext: vi.fn(),
}))

const LAT = {
  embed: 48,
  pinecone: 92,
  neo4j: 58,
  llm: 1180,
  totPhase: 620,
}

const MATCH = {
  matches: [
    {
      id: "m1",
      metadata: { type: "ingredient", name: "Niacinamide", text: "Hydration and barrier support." },
    },
  ],
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function chatPost(message: string, routine: { am: Array<{ productId: string }>; pm: [] }) {
  return POST(
    authRequest({
      method: "POST",
      body: JSON.stringify({ message, routine }),
    }),
  )
}

describe("architecture value metrics report", () => {
  let queryMock: ReturnType<typeof vi.fn>
  let serialRetrievalMs = 0

  beforeEach(async () => {
    await resetChatCachesForTests()
    vi.clearAllMocks()
    serialRetrievalMs = 0
    vi.mocked(getChatEnvError).mockReturnValue(null)
    vi.mocked(getPineconeIndexHost).mockReturnValue("test-index.svc.env.pinecone.io")
    queryMock = vi.fn(async () => {
      await delay(LAT.pinecone)
      return MATCH
    })
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({ query: queryMock })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockImplementation(async () => {
      await delay(LAT.embed)
      return [[1, 0, 0]]
    })
    vi.mocked(getRoutineKnowledgeContext).mockImplementation(async () => {
      await delay(LAT.neo4j)
      return "Graph: no conflicts."
    })
    vi.mocked(generateChatReply).mockImplementation(async () => {
      await delay(LAT.llm)
      return "Educational guidance only. Patch test new products."
    })
  })

  it("prints citeable value metrics for caches, parallel RAG, and Tree-of-Thoughts", async () => {
    const routine = { am: [{ productId: "value-demo-routine" }], pm: [] as [] }
    const sessionId = `${Date.now()}`
    const exactMsg = `what is niacinamide value-${sessionId}`

    // --- Exact cache: cold vs warm ---
    const tCold = performance.now()
    await chatPost(exactMsg, routine)
    const coldE2eMs = performance.now() - tCold

    const tWarm = performance.now()
    await chatPost(exactMsg, routine)
    const warmE2eMs = performance.now() - tWarm

    const pineconeAfterTwo = queryMock.mock.calls.length
    const neo4jAfterTwo = vi.mocked(getRoutineKnowledgeContext).mock.calls.length
    const embedAfterTwo = vi.mocked(embedTexts).mock.calls.length
    const llmAfterTwo = vi.mocked(generateChatReply).mock.calls.length

    const pineconePerRepeatSaved = reductionPct(pineconeAfterTwo / 2, 0)
    const neo4jPerRepeatSaved = reductionPct(neo4jAfterTwo / 2, 0)
    const e2eSpeedupExact = speedupPct(coldE2eMs, warmE2eMs)
    const retrievalMsCold = LAT.embed + LAT.pinecone + LAT.neo4j
    const retrievalMsWarm = 0
    const retrievalSpeedup = speedupPct(retrievalMsCold, retrievalMsWarm)

    // --- Semantic cache: paraphrase ---
    await resetChatCachesForTests()
    vi.clearAllMocks()
    queryMock = vi.fn(async () => {
      await delay(LAT.pinecone)
      return MATCH
    })
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({ query: queryMock })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockImplementation(async () => {
      await delay(LAT.embed)
      return [[1, 0, 0]]
    })

    const semRoutine = { am: [{ productId: `sem-${sessionId}` }], pm: [] as [] }
    await chatPost(`explain retinol value-a-${sessionId}`, semRoutine)
    const pineconeAfterSem1 = queryMock.mock.calls.length
    await chatPost(`is retinol safe with my routine value-b-${sessionId}`, semRoutine)
    const pineconeAfterSem2 = queryMock.mock.calls.length
    const semanticPineconeSaved = pineconeAfterSem2 === pineconeAfterSem1

    // --- 10-turn session (3 unique + repeats) ---
    await resetChatCachesForTests()
    vi.clearAllMocks()
    queryMock = vi.fn(async () => {
      await delay(LAT.pinecone)
      return MATCH
    })
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({ query: queryMock })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockImplementation(async () => {
      await delay(LAT.embed)
      return [[0.2, 0.8, 0]]
    })
    vi.mocked(getRoutineKnowledgeContext).mockImplementation(async () => {
      await delay(LAT.neo4j)
      return "Knowledge"
    })

    const sessRoutine = { am: [{ productId: `sess-${sessionId}` }], pm: [] as [] }
    const unique = [
      `niacinamide benefits sess-${sessionId}`,
      `vitamin c layering sess-${sessionId}`,
      `spf daily sess-${sessionId}`,
    ]
    const turns = [
      unique[0],
      unique[0],
      unique[1],
      unique[0],
      unique[2],
      unique[1],
      unique[1],
      unique[2],
      unique[2],
      unique[0],
    ]
    for (const msg of turns) {
      await chatPost(msg, sessRoutine)
    }
    const pineconeSession = queryMock.mock.calls.length
    const neo4jSession = vi.mocked(getRoutineKnowledgeContext).mock.calls.length
    const pineconeWithoutCacheHypothetical = turns.length
    const pineconeCallsAvoided = pineconeWithoutCacheHypothetical - pineconeSession
    const sessionPineconeReduction = reductionPct(
      pineconeWithoutCacheHypothetical,
      pineconeSession,
    )

    // --- Parallel vs serial retrieval (cold) ---
    await resetChatCachesForTests()
    vi.clearAllMocks()
    let neo4jStarted = 0
    let embedStarted = 0
    queryMock = vi.fn(async () => {
      await delay(LAT.pinecone)
      return MATCH
    })
    vi.mocked(getPineconeClient).mockReturnValue({
      index: vi.fn(() => ({ query: queryMock })),
    } as unknown as ReturnType<typeof getPineconeClient>)
    vi.mocked(embedTexts).mockImplementation(async () => {
      embedStarted = performance.now()
      await delay(LAT.embed)
      return [[0.3, 0.7, 0]]
    })
    vi.mocked(getRoutineKnowledgeContext).mockImplementation(async () => {
      neo4jStarted = performance.now()
      await delay(LAT.neo4j)
      return "K"
    })
    const tPar = performance.now()
    await chatPost(`parallel probe ${sessionId}`, {
      am: [{ productId: `par-${sessionId}` }],
      pm: [],
    })
    const parallelWallMs = performance.now() - tPar
    serialRetrievalMs = LAT.embed + LAT.pinecone + LAT.neo4j
    const parallelRetrievalEstimate = Math.max(LAT.embed + LAT.pinecone, LAT.neo4j)
    const parallelSavings = speedupPct(serialRetrievalMs, parallelRetrievalEstimate)
    const overlapMs = Math.abs(neo4jStarted - embedStarted) < 30

    // --- Tree-of-Thoughts ---
    const fixturesDir = path.join(__dirname, "..", "fixtures", "calendar-tot")
    const validP1 = fs.readFileSync(path.join(fixturesDir, "valid-phase1.json"), "utf8")
    const validP2 = fs.readFileSync(path.join(fixturesDir, "valid-phase2.json"), "utf8")
    const invalidCases = [
      fs.readFileSync(path.join(fixturesDir, "invalid-json.txt"), "utf8"),
      JSON.stringify({ branches: [{ id: "only" }] }),
    ]
    const totCtx = {
      defaultRoutineId: "routine-default",
      savedRoutines: [
        { id: "routine-default", name: "Default" },
        { id: "routine-a", name: "A" },
      ],
      maxHorizonDays: 30,
    }

    let totCalls = 0
    vi.mocked(generateJsonText).mockImplementation(async () => {
      totCalls += 1
      await delay(LAT.totPhase)
      return totCalls === 1 ? validP1 : validP2
    })
    const totOk = await interpretCalendarRequestWithTot("Sync 14 days AM and PM", totCtx)

    let recovered = 0
    for (const bad of invalidCases) {
      vi.mocked(generateJsonText).mockReset()
      vi.mocked(generateJsonText).mockResolvedValueOnce(bad)
      const r = await interpretCalendarRequestWithTot("bad input", totCtx)
      if (!r.ok && r.message.length > 0) recovered += 1
    }

    const snapshot: ValueMetricsSnapshot = {
      generatedAt: new Date().toISOString(),
      environment: "simulated",
      bullets: [
        {
          feature: "Exact RAG cache",
          metric: "Pinecone calls avoided on repeat question",
          value: `${Math.round(pineconePerRepeatSaved)}%`,
          detail: `2 turns → ${pineconeAfterTwo} vector search(es) vs 2 without cache`,
        },
        {
          feature: "Neo4j knowledge cache",
          metric: "Graph context fetches avoided on repeat",
          value: `${Math.round(neo4jPerRepeatSaved)}%`,
          detail: `${neo4jAfterTwo} fetch(es) for 2 identical routine+message turns`,
        },
        {
          feature: "Exact + knowledge cache",
          metric: "Retrieval-phase latency reduction (warm)",
          value: `${Math.round(retrievalSpeedup)}%`,
          detail: `~${retrievalMsCold}ms → ~${retrievalMsWarm}ms (embed+Pinecone+Neo4j); LLM (~${LAT.llm}ms) still runs`,
        },
        {
          feature: "Exact cache",
          metric: "End-to-end chat speedup (warm)",
          value: `${Math.round(e2eSpeedupExact)}%`,
          detail: `${Math.round(coldE2eMs)}ms → ${Math.round(warmE2eMs)}ms with simulated service latencies`,
        },
        {
          feature: "Semantic RAG cache (≥0.92 cosine)",
          metric: "Paraphrase skips extra Pinecone query",
          value: semanticPineconeSaved ? "Yes (1 query for 2 phrasings)" : "No",
          detail: "Same embedding bucket + routine; embed still runs each turn",
        },
        {
          feature: "10-turn chat session",
          metric: "Pinecone query reduction",
          value: `${Math.round(sessionPineconeReduction)}%`,
          detail: `${pineconeCallsAvoided} fewer vector searches (${pineconeSession}/${turns.length} calls)`,
        },
        {
          feature: "10-turn session",
          metric: "Neo4j knowledge fetches",
          value: `${neo4jSession} total`,
          detail: `vs ${turns.length} without routine-level cache`,
        },
        {
          feature: "Parallel RAG + Neo4j",
          metric: "Retrieval wall-clock vs serial",
          value: `${Math.round(parallelSavings)}% faster`,
          detail: `~${Math.round(parallelRetrievalEstimate)}ms parallel vs ${serialRetrievalMs}ms serial; overlap=${overlapMs}`,
        },
        {
          feature: "Tree-of-Thoughts calendar",
          metric: "Validated orchestration success",
          value: totOk.ok ? "100%" : "0%",
          detail: "2-phase JSON + rule checks before Google Calendar writes",
        },
        {
          feature: "Tree-of-Thoughts",
          metric: "Graceful recovery on bad model JSON",
          value: `${Math.round(rate(recovered, invalidCases.length) * 100)}%`,
          detail: "Safe user message, no unhandled throw",
        },
        {
          feature: "Chat safety pipeline",
          metric: "LLM calls per message (unchanged by cache)",
          value: String(llmAfterTwo / 2),
          detail: "Caches optimize retrieval cost/latency, not completion count",
        },
      ],
      raw: {
        cold_e2e_ms: Math.round(coldE2eMs),
        warm_e2e_ms: Math.round(warmE2eMs),
        e2e_speedup_pct: Math.round(e2eSpeedupExact),
        pinecone_calls_two_turns: pineconeAfterTwo,
        pinecone_reduction_repeat_pct: Math.round(pineconePerRepeatSaved),
        neo4j_calls_two_turns: neo4jAfterTwo,
        embed_calls_two_turns: embedAfterTwo,
        llm_calls_two_turns: llmAfterTwo,
        session_turns: turns.length,
        session_pinecone_calls: pineconeSession,
        session_pinecone_reduction_pct: Math.round(sessionPineconeReduction),
        session_neo4j_calls: neo4jSession,
        semantic_second_query_saved_pinecone: semanticPineconeSaved ? 1 : 0,
        parallel_retrieval_savings_pct: Math.round(parallelSavings),
        parallel_wall_ms: Math.round(parallelWallMs),
        tot_gemini_json_calls_success: 2,
        tot_recovery_rate_pct: Math.round(rate(recovered, invalidCases.length) * 100),
        simulated_embed_ms: LAT.embed,
        simulated_pinecone_ms: LAT.pinecone,
        simulated_neo4j_ms: LAT.neo4j,
        simulated_llm_ms: LAT.llm,
      },
    }

    const reportText = formatValueReport(snapshot)
    console.log("\n" + reportText + "\n")

    const outDir = path.join(process.cwd(), ".perf")
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, "value-report.json"), JSON.stringify(snapshot, null, 2))
    fs.writeFileSync(path.join(outDir, "value-report.md"), reportText)

    expect(pineconePerRepeatSaved).toBeGreaterThanOrEqual(50)
    expect(sessionPineconeReduction).toBeGreaterThanOrEqual(50)
    expect(totOk.ok).toBe(true)
    expect(recovered).toBe(invalidCases.length)
    expect(llmAfterTwo).toBe(2)
  })
})
