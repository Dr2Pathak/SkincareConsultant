# Skincare Consultant

Routine-centric skincare compatibility and guidance web app. The app combines:

- A **Next.js 15** App Router frontend with Tailwind and dark mode.
- A **Supabase**-backed profile + routines store.
- A **Neo4j knowledge graph** for ingredient conflicts/helps.
- A **Pinecone + Gemini RAG stack** for ingredient/product guidance.
- A **routine calendar** with per-day routine assignments and calendar/CSV exports.

All guidance is **educational only**, not medical advice; features emphasize patch-testing, avoiding irritation, and understanding ingredients.

---

## Quick start

From the repo root:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Pre-commit runs lint + typecheck; pre-push runs tests.

---

## Core features

### Routine builder and management

- **AM/PM routine builder (`/routine`)**
  - Add and edit ordered AM/PM steps (with products attached).
  - Helpful empty state messaging when no steps exist.
- **Routine naming**
  - Routines have user-visible names (e.g. “Morning brightening”, “Barrier repair”).
  - Names are normalized/length-limited on both client and server.
- **Multiple routines + current routine**
  - `GET /api/routines` lists all routines with `is_current` and `updated_at`.
  - `PATCH /api/routine/current` sets the active routine.
  - The routine page’s “My Routines” card lets users switch, create, and delete routines, showing which is current.

### Compatibility and ingredient intelligence

- **Product compatibility (`/product-check`, `GET /api/compatibility`)**
  - Uses **Supabase** for product data (`products` with `inci_list`) and profiles (`profiles` with `skin_types`, `concerns`, `avoid_list`, `tolerance`).
  - **Hard safety rules**:
    - If any product INCI matches an `avoid_list` entry (case-insensitive, substring-aware), verdict becomes `not_recommended`, score ≤ 30, and reasons + ingredient notes explain the match.
  - **Knowledge graph conflicts (Neo4j)**:
    - Resolves INCI strings to graph node ids via `resolveInciListToNodeIds` (slugification + synonym map).
    - MATCHes `CONFLICTS_WITH` edges; any hits drop score to at most 60 and set verdict to `patch_test` (unless already `not_recommended`) with a generic conflict reason.
  - **RAG goalAlignment (Pinecone + Gemini)**:
    - Embeds a profile + product summary query via Gemini.
    - Queries Pinecone with `topK` and `includeMetadata: true`.
    - Computes an average similarity score from returned matches.
    - Adds a `Goal alignment` dimension:
      - `good` when average score ≥ 0.35 with supportive explanation.
      - `warning` when > 0 with a soft caution.
    - Does **not** override safety rules; it only adds nuance to the verdict.

- **Routine insights from the graph**
  - `GET /api/routine-insights` and `lib/routine-knowledge.ts`:
    - Load routine product INCIs from Supabase.
    - Resolve to graph ids and query Neo4j for:
      - `CONFLICTS_WITH` edges (deduplicated ingredient pairs).
      - `HELPS` edges (ingredient → target concerns).
    - Returned as structured `conflicts[]` and `helps[]`, rendered by `RoutineInsightsCard` on `/routine`.

- **INCI resolver (`lib/inci-resolver.ts`)**
  - Runtime mapping of free-text INCI names to canonical graph node ids.
  - Encapsulates slug logic + synonym mapping to stay in sync with the offline `combine-datasets` pipeline.
  - Thoroughly unit-tested for simple slugging, synonyms, deduplication, and empty inputs.

### RAG + knowledge-graph chat

- **Chat API (`POST /api/chat`)**
  - Inputs:
    - `message: string` (required).
    - Optional `routine` (AM/PM arrays of steps with `productId` and `product` name/brand).
    - Optional `queryType` (`ingredient` | `product` | `routine`) to bias RAG filters.
  - **Routine-aware answering**
    - The chat UI sends the *selected* routine snapshot to `POST /api/chat` (defaulting to the routine scheduled for today), so Neo4j “routine knowledge” context always matches what the user wants answers for.
  - **RAG (Pinecone + Gemini)**:
    - Embeds the message with Gemini (`embedTexts`).
    - Queries Pinecone with:
      - `topK` and `includeMetadata: true`.
      - A filter built from `queryType` to restrict `RagMetadata.type` to relevant doc types.
    - Optionally runs a second RAG query focused on the routine’s products and merges results, deduping by id.
    - On cache misses, Pinecone retrieval is run in parallel with Neo4j knowledge-context generation to reduce end-to-end latency.
  - **Neo4j knowledge graph context**:
    - When a routine is provided, extracts product ids and calls `getRoutineKnowledgeContext`, which uses Neo4j conflicts/helps for those ingredients.
    - This context is appended to the system prompt, grounding responses in actual routine data.
  - **Context caching (two layers)**:
    - **Pinecone RAG context cache**: keyed by normalized message + routine hash.
    - **Neo4j knowledge-context cache**: keyed by routine hash only.
    - Both caches use TTL-based expiration so memory stays bounded (caches are per server instance).
  - **Prompting**:
    - System prompt describes the assistant as a skincare consultant with:
      - Clear safety constraints (no diagnosis/treatment, must recommend patch testing).
      - Instructions to use RAG + knowledge-graph context + routine information.
    - Retrieved RAG context is trimmed to keep Gemini completions fast (currently capped to an ~8k character slice).
  - **Error handling**:
    - Detailed logging server-side; safe, succinct error messages returned to the client for debugging misconfigurations (e.g. missing API keys) without leaking sensitive internals.

**How RAG + the knowledge graph work together**

Under the hood, Skincare Consultant maintains a **semantic knowledge layer** (Pinecone + Gemini) and a **structural knowledge layer** (Neo4j graph) and merges both into every chat and compatibility decision. The RAG layer is fed with curated chunks about ingredients, products, and best‑practice guidance; each chunk carries rich `RagMetadata` (type, name, text, brand, concern tags). When a user asks a question, the system embeds the query with Gemini, retrieves the most relevant chunks from Pinecone (optionally running a second pass focused on the user’s actual routine products), and formats them into readable context blocks. In parallel, the Neo4j graph is queried for concrete relationships between the ingredients in the user’s routine and the products they ask about — conflicts are pulled from `CONFLICTS_WITH` edges and synergies from `HELPS` edges. The final prompt that goes to Gemini is therefore backed by **both**: high‑recall semantic context from RAG and high‑precision, schema‑level relationships from the graph. This design makes the assistant feel knowledgeable and specific (it can talk about real ingredient interactions in the user’s routine), while still being explainable and auditable: every answer can be traced back to a combination of retrieved documents and explicit graph edges instead of opaque, purely generative guesses.

### Instant Access (bootstrap consolidation)

- **Routine page**: `GET /api/routine-bootstrap` consolidates initial routine loading (routine + health + insights + schedule events) into a single faster request.
- **Calendar page**: `GET /api/routine-calendar-bootstrap` loads saved routines, the computed default routine id, and per-day overrides in one response.
- **Ingredients page**: `GET /api/routine-ingredient-ids` returns normalized routine ingredient ids in one call (avoiding N+1 product/INCI lookups).

### Routine calendar and scheduling

- **Schedule builder (`lib/routine-schedule.ts`)**
  - `buildRoutineSchedule(routine, prefs, scope, { horizonDays, today? })`:
    - Generates `RoutineScheduleEvent[]` with:
      - `date`, `time`, `label`, `routineId`, `routineName`, `products`, and `tags`.
    - Supports:
      - AM routine events (tagged `am`).
      - PM routine events (tagged `pm`).
      - Weekly treatment events (tagged `weekly`, `treatment`) on configured weekdays.
  - Fully unit-tested:
    - AM/PM/weekly events across a horizon.
    - Defaults for missing times.
    - No output when there are no steps.

- **Calendar preview on `/routine`**
  - Sidebar card:
    - Renders an at-a-glance list of *upcoming* events (up to 12) for the current routine, via `getRoutineSchedulePreview`.
    - Offers a **Download .ics** button wired to `POST /api/routine-schedule/ics` (calendar file export).
    - Includes an **“Open full calendar →”** link to `/routine/calendar`.

- **Full calendar page (`/routine/calendar`)**
  - Controls:
    - **Default routine** selector from all saved routines (via `getRoutines()` and `getRoutine()`).
    - Scope toggles: `Include AM`, `Include PM`, `Weekly treatments`.
    - Time pickers: `AM time`, `PM time`, `Treatment time`.
    - Horizon: 2 / 4 / 6 weeks.
    - Weekly treatment nights: Mon–Sun pills, interactive and styled for both light/dark themes.
  - **Per-day routine assignment (persisted)**:
    - Each day card:
      - Shows date and a dropdown to choose which routine runs on that day.
      - Choices are persisted as `schedule_overrides` on the user’s `profiles` row:
        - Map of `YYYY-MM-DD` → `routineId`.
    - API + data layer:
      - `GET /api/schedule-overrides` returns `{ overrides: Record<string, string> }`.
      - `PATCH /api/schedule-overrides` upserts overrides into Supabase, using `upsert` on `profiles`.
      - `lib/api.ts` and `lib/data.ts` expose `getScheduleOverrides()` and `updateScheduleOverrides(overrides)`.
    - Rendering:
      - For each day in the horizon:
        - Computes `routineIdForDay = overrides[date] ?? defaultRoutineId`.
        - Finds that routine in `savedRoutines` and calls `buildRoutineSchedule` with `horizonDays: 1` and `today = date` to get that day’s events.
  - **AI suggestion mode (beta)**:
    - If the user has at least two routines:
      - Treats the first as a base routine and the second as a treatment routine.
      - For each date in the horizon:
        - If the weekday is in the selected treatment days, assigns the second routine in overrides.
    - Persists suggested overrides via `updateScheduleOverrides`, still allowing users to tweak per-day assignments manually.
  - **UI/UX**:
    - Calendar presented as a colorful, Google-calendar-style card grid with:
      - Time chips (AM/PM/Treatment) styled with theme tokens.
      - Smooth dark-mode support via `ThemeProvider`.
    - `Suggest schedule (beta)` button clearly labeled and non-destructive.

### Exports

- **Calendar export to `.ics`** (`POST /api/routine-schedule/ics`)
  - Uses the same schedule builder logic to generate events over a horizon.
  - Emits a standard VCALENDAR file with:
    - `DTSTART`, `SUMMARY`, `DESCRIPTION`, and stable `UID`s.
  - Served with `Content-Type: text/calendar` and `Content-Disposition: attachment; filename="...ics"`.
  - Triggered by the **Download .ics** button on `/routine`.

- **History CSV export** (`GET /api/export/history`)
  - Aggregates:
    - The current routine snapshot from Supabase.
    - Basic information about products in the routine.
  - Uses `lib/history-export.ts`:
    - `HistoryCsvRow` type and `rowsToCsv` functionality.
    - Proper escaping for commas, quotes, and newlines.
  - Downloaded via the **Export history (CSV)** button in the routine page’s Quick Actions.

### Dark mode & theming

- App wrapped in a `ThemeProvider` (`next-themes`) in `app/layout.tsx` with `attribute="class"`.
- `ThemeToggle` component:
  - Client-only, uses `useTheme` to switch between dark/light.
  - Uses a `mounted` state guard to avoid hydration mismatches.
  - Animates sun/moon icons with Tailwind transitions and respects dark mode colors.

---

## Stack and architecture

- **Frontend**
  - Next.js 15 App Router (`skincareconsultant/app/`).
  - React + TypeScript.
  - Tailwind CSS and `lucide-react`.
  - `next-themes` for dark mode.
  - Vitest + Testing Library for unit and integration tests.

- **Backend / APIs**
  - RESTful endpoints under `skincareconsultant/app/api`:
    - Profile: `/api/profile`.
    - Routine CRUD: `/api/routine`, `/api/routines`, `/api/routine/current`, `/api/routine-health`, `/api/routine-insights`.
    - Bootstrap consolidation:
      - `/api/routine-bootstrap`
      - `/api/routine-calendar-bootstrap`
      - `/api/routine-ingredient-ids`
    - Compatibility: `/api/compatibility`.
    - Chat / RAG: `/api/chat`.
    - Knowledge graph snapshot: `/api/graph`.
    - Calendar: `/api/routine-schedule/preview`, `/api/routine-schedule/ics`, `/api/schedule-overrides`.
    - Exports: `/api/export/history`.

- **Data stores**
  - **Supabase Postgres**:
    - `profiles(id, skin_types, concerns, avoid_list, tolerance, schedule_overrides, updated_at)`.
    - `routines(id, user_id, am, pm, is_current, updated_at)`.
    - `products(id, name, brand, inci_list, category, description, updated_at)`.
  - **Neo4j**:
    - Ingredient nodes and edges (`CONFLICTS_WITH`, `HELPS`) used for compatibility and insights.
  - **Pinecone + Gemini (RAG stack)**:
    - Vector index of ingredient/product/guidance documents with types set via `RagMetadata`.
    - Gemini handles both embeddings and chat completions.

---

## Structure

- **skincareconsultant/** — Next.js 15 App Router frontend (Tailwind, dark mode, full feature set).
- **scripts/combine-datasets/** — Pipeline to combine Kaggle datasets into products + graph + RAG JSON. See [scripts/combine-datasets/README.md](scripts/combine-datasets/README.md).
- **scripts/migrations/** — SQL migrations for Supabase tables (e.g. `add-schedule-overrides.sql`).
- **.husky/** — Git hooks (lint + typecheck on commit, tests on push).
- **docs/** — [INTEGRATE_V0.md](docs/INTEGRATE_V0.md) and other developer docs.

---

## Commands (from root)

| Command                        | Runs in workspace                 |
|--------------------------------|-----------------------------------|
| `npm run dev`                  | Next.js dev server                |
| `npm run build`                | Next.js build                     |
| `npm run start`                | Next.js production                |
| `npm run lint`                 | ESLint (Next + core-web-vitals)  |
| `npm run typecheck`            | `tsc --noEmit`                    |
| `npm run test`                 | Vitest                            |
| `npm run combine-datasets`     | Download Kaggle data and build products + graph |
| `npm run combine-datasets:dry-run` | Run pipeline without writing files |
| `npm run test:scripts`         | Vitest for `scripts/combine-datasets` |

---

## Backend and data pipeline

- See [scripts/combine-datasets/README.md](scripts/combine-datasets/README.md) for the full offline data preparation flow:
  - Downloads Kaggle datasets.
  - Normalizes and merges product and ingredient data.
  - Emits:
    - Supabase-ready product JSON.
    - Neo4j graph (nodes/edges/Cypher).
    - RAG chunks with `RagMetadata` for Pinecone.

---
