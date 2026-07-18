# Metrics test suite

This project measures AI inference, API performance, infrastructure caching, and pipeline reliability through **Vitest metrics tests** (CI-safe, mocked) and an **optional live perf runner** (real services).

## Quick start

```bash
# Citeable value report (simulated realistic latencies → .perf/value-report.md)
npm run report:value

# CI-safe metrics tests (mocked; no API keys)
npm run test:metrics

# From skincareconsultant workspace
npm run test:metrics -w skincareconsultant
```

```bash
# Live perf (requires running server + env)
npm run start
RUN_LIVE_METRICS=1 PERF_BASE_URL=http://localhost:3000 npm run perf:metrics
```

Live output is written to `skincareconsultant/.perf/last-report.json` (gitignored).

`npm run report:value` writes **`skincareconsultant/.perf/value-report.md`** and **`value-report.json`** with headline bullets for caches, semantic RAG, parallel retrieval, and Tree-of-Thoughts.

## What each suite covers

### AI / inference

| Metric | Test location | Notes |
|--------|---------------|-------|
| Average LLM latency | `app/api/chat/route.metrics.test.ts` | Mocked `generateChatReply` delay |
| End-to-end chat time | `route.metrics.test.ts` | Cold vs warm `performance.now()` |
| Repeated-query speedup | `route.metrics.test.ts`, `cache.metrics.test.ts` | Exact + semantic RAG cache |
| Duplicate API call reduction | `route.metrics.test.ts` | Pinecone / Neo4j call counts |
| Time-to-first-token (TTFT) | **Gap** | Chat uses blocking `generateContent`; no streaming |
| Live Gemini latency | `lib/gemini.metrics.test.ts`, `scripts/perf/run-metrics.ts` | `RUN_LIVE_METRICS=1` + `GEMINI_API_KEY` |

**Important:** On cache hits, **Gemini still runs every turn** (RAG context is reused; LLM is not). Wording for resumes should say “reduced duplicate retrieval work” rather than “reduced inference latency” unless streaming LLM cache is added.

### Backend / system

| Metric | Test location | Notes |
|--------|---------------|-------|
| API response time | `app/api/api.metrics.test.ts` | Health, compatibility, routine-health |
| Failure / success rate | `api.metrics.test.ts`, `pipeline.metrics.test.ts` | Injected errors |
| Concurrent requests / throughput | `scripts/perf/load-api.ts` | Live only |
| Retry success rate | **Gap** | No app-level retry wrapper |

### Infrastructure

| Metric | Test location | Notes |
|--------|---------------|-------|
| Cache hit rate | `cache.metrics.test.ts` | Exact RAG, knowledge TTL |
| Cold-start time | `scripts/perf/cold-start.ts` | Poll `/api/health` |
| Memory delta under load | `scripts/perf/run-metrics.ts` | `heapUsed` before/after |
| Deployment uptime | **Gap** | Use host monitoring (e.g. Vercel) |
| Session lifecycle | Client-only (`lib/chat-storage.ts`) | Not server-scoped |

### AI pipeline

| Metric | Test location | Notes |
|--------|---------------|-------|
| Structured JSON parsing | `lib/calendar-ai-tot.metrics.test.ts` | Golden fixtures |
| Invalid-response recovery | `calendar-ai-tot.metrics.test.ts` | Graceful `ok: false` |
| Hallucination mitigation | `pipeline.metrics.test.ts` | System prompt safety clauses |
| Orchestration success | `pipeline.metrics.test.ts`, `calendar-ai-tot.metrics.test.ts` | Parallel RAG + Neo4j; ToT success rate |

## Shared utilities

- [`skincareconsultant/lib/metrics/collector.ts`](../skincareconsultant/lib/metrics/collector.ts) — timings, counters, `reductionPct`, `speedupPct`
- [`skincareconsultant/lib/metrics/report.ts`](../skincareconsultant/lib/metrics/report.ts) — `formatMetricsSummary()`

## Live perf environment variables

| Variable | Purpose |
|----------|---------|
| `RUN_LIVE_METRICS` | Must be `1` for perf scripts |
| `PERF_BASE_URL` | Server URL (default `http://localhost:3000`) |
| `GEMINI_API_KEY` | Gemini latency probes |
| `PERF_AUTH_TOKEN` | Bearer token for `/api/chat` e2e probe |
| `PINECONE_*` | Required only if chat probe hits real RAG |

### Load test CLI

```bash
RUN_LIVE_METRICS=1 tsx scripts/perf/load-api.ts \
  --baseUrl http://localhost:3000 \
  --route /api/health \
  --concurrency 20 \
  --durationSec 10
```

### Cold start

```bash
RUN_LIVE_METRICS=1 tsx scripts/perf/cold-start.ts --baseUrl http://localhost:3000
```

Run cold-start while the server is still booting, or against a cold deployment URL.

## Gaps (future instrumentation)

| Metric | Blocker |
|--------|---------|
| TTFT | Streaming Gemini + SSE chat route |
| Retry success rate | Shared `withRetry()` around external APIs |
| Session-aware LLM cache | Server caches are per-instance, not user-scoped |
| Semantic hallucination rate | Would need LLM-judge or human eval set |
| Deployment uptime | External observability, not Vitest |

## Example report lines

After `npm run test:metrics`, tests log collector summaries. Example rate keys:

- `chat_pinecone_duplicate_call_reduction_pct`
- `chat_exact_rag_cache_hit_rate`
- `calendar_tot_parse_recovery_rate`
- `chat_orchestration_success_rate`

After live perf:

- `health_p95_ms`
- `gemini_generateChatReply_p95_ms`
- `chat_e2e_p95_ms` (when `PERF_AUTH_TOKEN` is set)

## CI recommendation

Add `npm run test:metrics` to PR checks. Do **not** run `npm run perf:metrics` in CI without secrets and a running server.
