# Skincare Consultant – Product Requirements Document (PRD)

**Skincare Consultant** is a routine‑centric skincare compatibility and guidance platform. It helps users:

- Build and manage multiple named AM/PM routines.
- Check product compatibility against their skin profile and avoid list.
- Understand ingredient interactions via a **Neo4j knowledge graph**.
- Get context‑aware answers from a **RAG (Pinecone + Gemini)** chat.
- Visualize and schedule routines on a calendar with per‑day assignments.
- Export schedules and history as standard files (ICS, CSV).

The system is explicitly **not** medical advice. All features are designed to provide educational, explainable guidance and emphasize patch‑testing and caution rather than diagnosis or treatment.

---

## 1. Features

### 1.1 User profile & routines

- **User Profile**
  - Stores:
    - `skinTypes[]` (e.g. `\"oily\"`, `\"sensitive\"`).
    - `concerns[]` (e.g. `\"acne\"`, `\"pigmentation\"`).
    - `avoidList[]` (ingredients user avoids).
    - `tolerance` (`low` | `medium` | `high`).
  - Backed by Supabase `profiles` table.
  - Loaded via `/api/profile` and used by compatibility, health, and chat.

- **Routine Builder (AM/PM)**
  - Page: `/routine`.
  - Two tabs:
    - Morning (AM).
    - Evening (PM).
  - Steps:
    - Ordered list of `RoutineStep` objects with `id`, `order`, `label`, optional `product`.
    - Product picker integrates with the catalog (`products` table).
  - Empty states:
    - Friendly, guided cards when there are zero steps.

- **Named routines & multi‑routine management**
  - Each routine has a name (default `"My routine"`), editable on `/routine`.
  - Normalization:
    - Trim, cap to 64 chars, default when empty.
    - Applied both client‑side and in `/api/routine`.
  - Multiple routines per user:
    - `GET /api/routines` returns all routines with `is_current`.
    - `PATCH /api/routine/current` marks a routine as current.
  - “My Routines” sidebar:
    - Shows routines with current badge, actions to switch, delete, or create new.

### 1.2 Product compatibility engine

**Goal:** Given a product, explain whether it fits the user’s profile and why.

- **Inputs**
  - `productId` from the client.
  - Supabase:
    - `products(id, name, inci_list)` (INCI stored as jsonb array).
    - `profiles(id, skin_types, concerns, avoid_list, tolerance)`.

- **Hard safety rules**
  - Avoid list:
    - For each product ingredient string:
      - Check for case‑insensitive substring overlap with each avoid list entry.
    - If any match:
      - Verdict: `not_recommended`.
      - Score: at most 30.
      - Label: `"Not recommended"`.
      - Adds a reason: `\"Contains an ingredient you avoid: ...\"`.
      - Adds an `IngredientNote` with `type: \"danger\"`.

- **Graph conflicts (Neo4j)**
  - Ingredient resolution:
    - `resolveInciListToNodeIds` maps raw INCI names to canonical graph ids using:
      - Normalization + slugging.
      - Runtime synonym map aligned with the offline pipeline.
  - Graph query:
    - `MATCH (a)-[:CONFLICTS_WITH]->(b) WHERE a.id IN $ids OR b.id IN $ids`.
    - If any conflicts:
      - If not already `not_recommended`, set verdict to `patch_test`.
      - Score: at most 60.
      - Label: `"Patch test recommended"`.
      - Add a generic conflict reason.
  - Failure mode:
    - If Neo4j is not configured or errors, log a warning and continue using avoid‑list logic only.

- **Goal alignment (RAG)**
  - When profile has `concerns` or `skin_types`:
    - Builds a text query describing:
      - Profile concerns, skin types, tolerance.
      - Product name + leading ingredients.
    - Uses Gemini to embed this query.
    - Queries Pinecone with `topK`, `includeMetadata: true`.
    - Collects similarity scores, averages positive scores.
    - Adds a `Goal alignment` dimension:
      - `good` when average ≥ 0.35 (with supportive explanation).
      - `warning` when 0 < average < 0.35 (with cautionary explanation).
  - Does not override safety rules:
    - Avoid list and conflicts remain the primary determinants of the main verdict and score.

### 1.3 Graph‑backed routine insights

**Goal:** Give a non‑LLM, inspectable view of ingredient interactions in the user’s routine.

- Uses Supabase + Neo4j to:
  - Fetch product `inci_list` for the routine.
  - Map all ingredients to graph ids.
  - Query:
    - `CONFLICTS_WITH` edges to identify ingredient pairs that may conflict.
    - `HELPS` edges to identify ingredients that help specific concerns.
- Aggregates into:
  - `conflicts[]: { aLabel, bLabel }`.
  - `helps[]: { ingredient, targets[] }`.
- Served via `/api/routine-insights` and rendered by `RoutineInsightsCard` on `/routine`.

### 1.4 RAG + knowledge‑graph chat

**Goal:** Provide high‑quality, routine‑aware answers grounded in both documentation and the structured graph.

- **Inputs**
  - `message: string`.
  - Optional `routine` (AM/PM steps with product ids and names).
  - Optional `queryType` hint (`ingredient` | `product` | `routine`).

- **RAG (semantic layer: Pinecone + Gemini)**
  - RAG corpus generated by `scripts/combine-datasets` + `scripts/rag-ingest`:
    - Ingredient chunks.
    - Product chunks.
    - Guidance and FAQ chunks.
  - Each chunk carries `RagMetadata`:
    - `type`, `name`, `text`, `id`, `productId`, `brand`, `concernTags`, etc.
  - At query time:
    - Embeds the message via Gemini.
    - Queries Pinecone with:
      - `topK` results.
      - A metadata filter based on `queryType` (e.g., only ingredient docs).
    - Optionally runs a second query focused on routine product names and merges matches, deduping by id.

- **Knowledge graph (structural layer: Neo4j)**
  - Extracts product ids from the routine (if provided).
  - Calls a helper that:
    - Fetches product INCIs from Supabase.
    - Resolves them to graph ids.
    - Queries `CONFLICTS_WITH` and `HELPS` edges.
  - Produces a concise summary of:
    - Ingredient conflicts within the routine.
    - Ingredients that help specific concerns.

- **Prompt assembly and caching**
  - Builds a system prompt that includes:
    - Safety instructions (education only, patch‑test reminder).
    - Formatted view of the user’s routine (AM/PM steps).
    - Knowledge‑graph context (conflicts, helps).
    - RAG context assembled from Pinecone matches.
  - Applies a small in‑memory cache keyed by:
    - Normalized user message + hash of routine product ids.
    - Avoids repeated embedding + RAG calls for repeated questions.
  - Sends this prompt and the user message to Gemini to produce a reply.

**Why this is impressive:**  
The chat system is not a naive “LLM in front of a database”. It merges a **semantic retrieval layer** (Pinecone + Gemini embeddings) and a **structural knowledge layer** (Neo4j graph of ingredients and concerns). This means answers are grounded in:

- Retrievable documentation and product/ingredient snippets (RAG).
- Explicit relationships like “Ingredient A conflicts with Ingredient B” or “Ingredient C helps Concern D” (graph edges).

As a result, the assistant can reason about the user’s **actual routine** in a way that is both powerful and auditable — each answer can be traced back to exact chunks and graph edges instead of opaque model memory.

### 1.5 Routine calendar & per‑day scheduling

**Goal:** Visualize routines over time and allow flexible, persisted per‑day assignments.

- **Schedule builder (`buildRoutineSchedule`)**
  - Takes:
    - A `Routine` (AM/PM steps).
    - Scope (include AM, PM, weekly treatments).
    - Preferences (times, treatment days).
    - Horizon (number of days, optional fixed starting date).
  - Produces:
    - `RoutineScheduleEvent[]` with date, time, label, products, and tags (e.g. `am`, `pm`, `weekly`).

- **Calendar preview (on `/routine`)**
  - Sidebar card shows:
    - Next N events for the current routine.
  - Exports:
    - **Download .ics**: calendar file representing upcoming events.
    - Link to full calendar page (`/routine/calendar`).

- **Full calendar page (`/routine/calendar`)**
  - Controls:
    - Default routine selection from saved routines.
    - Scope toggles and time inputs.
    - Weekly treatment days (Mon–Sun pills).
    - Horizon (2/4/6 weeks).
  - Per‑day routine selection:
    - Each day card has a dropdown to choose which routine runs on that date.
    - Selections are stored in `profiles.schedule_overrides` (`date → routineId` map).
    - Uses `/api/schedule-overrides` and client helpers to fetch/persist.
  - Suggestion mode:
    - Optional “Suggest schedule (beta)” button:
      - For users with multiple routines:
        - Treats one routine as base, another as treatment.
        - Assigns treatment routine on configured weekly treatment days.
      - Writes suggestions into `schedule_overrides` but keeps UI fully editable.

- **Exports**
  - ICS export via `/api/routine-schedule/ics`.
  - CSV export via `/api/export/history` and `lib/history-export`.

### 1.6 Dark mode & UX

- Global theming via `next-themes` with `ThemeProvider` in layout.
- `ThemeToggle` component:
  - Safe hydration (mounted guard).
  - Animated sun/moon icons.
- Consistent Tailwind typography, cards, and responsive grids:
  - Builder + sidebar layout on `/routine`.
  - Calendar grid on `/routine/calendar`.

---

## 2. Tech Stack

- **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, `lucide-react`, `next-themes`.
- **Backend:** Next.js API routes (handlers under `skincareconsultant/app/api`).
- **Database:** Supabase Postgres with tables:
  - `profiles` (profile + schedule overrides).
  - `routines` (named AM/PM routines).
  - `products` (catalog with INCI lists).
- **Knowledge Graph:** Neo4j (ingredients, families, concerns, and `CONFLICTS_WITH` / `HELPS` edges).
- **RAG & AI:** Pinecone vector store + Gemini for embeddings and chat.
- **Testing & Tooling:** Vitest, Testing Library, ESLint, TypeScript `tsc --noEmit`, Husky, custom data pipeline scripts.

---

## 3. High‑Level Architecture

The system is organized around four coordinated subsystems:

1. **Profile & Routine Subsystem**
   - Handles user profile, AM/PM routines, routine naming, and multi‑routine management.
   - Exposes APIs for CRUD and “current routine” selection.
   - Drives the main routine page and its sidebar.

2. **Compatibility & Graph Subsystem**
   - Implements rule‑based compatibility (avoid list + warnings).
   - Connects to Neo4j to:
     - Use conflict edges in compatibility.
     - Use conflicts/helps edges in routine insights.
   - Uses the INCI resolver to bridge raw product data and graph ids.

3. **RAG & Chat Subsystem**
   - Manages ingestion of product/ingredient/guidance documents into Pinecone.
   - Orchestrates retrieval and prompt building for Gemini:
     - Semantic context from Pinecone.
     - Structural context from Neo4j.
     - Routine data from Supabase.
   - Provides a single `/api/chat` endpoint for the UI.

4. **Calendar & Export Subsystem**
   - Encapsulates routine scheduling, calendar visualization, per‑day overrides, and exports.
   - Reuses the schedule builder across preview, calendar page, and ICS export.
   - Uses Supabase `profiles.schedule_overrides` for persistence.

Each subsystem is mostly decoupled and communicates through strongly typed interfaces in `lib/types.ts` and thin API routes, making changes and additions localized and testable.

---

## 4. Data Model (Summary)

- **profiles**
  - `id` (uuid, PK, references auth user id).
  - `skin_types` (text[]).
  - `concerns` (text[]).
  - `avoid_list` (text[]).
  - `tolerance` (text).
  - `schedule_overrides` (jsonb `{ [date: string]: routineId }`).
  - `updated_at` (timestamptz).

- **routines**
  - `id` (uuid, PK).
  - `user_id` (uuid, FK).
  - `name` (text, default `"My routine"`).
  - `am` (jsonb array of steps).
  - `pm` (jsonb array of steps).
  - `is_current` (boolean).
  - `updated_at` (timestamptz).

- **products**
  - `id` (text, PK).
  - `name`, `brand` (text).
  - `inci_list` (jsonb array of ingredient strings).
  - `category` (text, optional).
  - `description` (text, optional).
  - `updated_at` (timestamptz).

---

## 5. Setup & Deployment (User‑Facing)

For full, non‑mock functionality, a user setting up the project must:

1. **Configure Supabase**
   - Create a project.
   - Run `scripts/supabase-schema.sql` (and any additional migrations like `scripts/migrations/add-schedule-overrides.sql`) in the SQL Editor.
   - Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` appropriately.

2. **Configure Neo4j**
   - Create a database (e.g. Neo4j Aura).
   - Load graph data (`graph.cypher`) generated by `scripts/combine-datasets`.
   - Set `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`.

3. **Configure Pinecone & Gemini**
   - Create a Pinecone index and note its host + API key.
   - Have a Gemini API key.
   - Run `npm run combine-datasets` then `npm run rag-ingest` to populate the index.
   - Set `PINECONE_API_KEY`, `PINECONE_INDEX_HOST` (or `PINECONE_HOST`), `GEMINI_API_KEY`.

4. **Run the App**
   - Copy `skincareconsultant/.env.example` to `skincareconsultant/.env.local` and fill in all keys.
   - Run:
     ```bash
     npm install
     npm run dev
     ```
   - Set `NEXT_PUBLIC_USE_MOCK=false` to use real backends.

5. **Optional Deployment (Vercel)**
   - Connect the repo to Vercel.
   - Add the same env vars to Vercel project settings.
   - Deploy; API routes will run in Vercel Serverless Functions.

---

## 6. Non‑Goals & Constraints

- The app does **not**:
  - Diagnose or treat medical conditions.
  - Guarantee compatibility or clinical outcomes.
  - Provide professional dermatology advice.
- The app **does**:
  - Encourage patch testing.
  - Warn about potential conflicts and high exfoliation/retinoid loads.
  - Provide explainable rationales for scores and recommendations.

This PRD is intended as a high‑level, implementation‑aware design document for maintainers, and reviewers. For day‑to‑day setup steps, see `docs/BACKEND_SETUP.md`; for a quick overview of features and technologies, see the root `README.md`.

