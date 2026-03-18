# Backend setup: Supabase, Neo4j, Pinecone

This guide is for **anyone cloning the repo** who wants to run Skincare Consultant end‑to‑end with their own backend. It walks through:

- Creating the necessary tables in Supabase using the SQL already in the repo.
- Loading the Neo4j ingredient graph.
- Building and ingesting the RAG index into Pinecone with Gemini.
- Wiring up environment variables for local development.

Nothing in this repo contains live keys. The app will only talk to **your** Supabase / Neo4j / Pinecone / Gemini once you configure them.

---

## 1. Supabase (profiles, routines, products)

Skincare Consultant uses Supabase for:

- `profiles` — user skin types, concerns, avoid list, tolerance, schedule overrides.
- `routines` — named AM/PM routines per user.
- `products` — product catalog with INCI lists.

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Settings → API**, note:
   - **Project URL**.
   - **anon public key**.
   - **service_role key** (server‑side only, never on the client).

### 1.2 Run the SQL from this repo

1. Open **Supabase Dashboard → SQL Editor**.
2. Paste and run the contents of `scripts/supabase-schema.sql`.
   - This will:
     - Create `public.profiles`, `public.routines`, `public.products`.
     - Add RLS policies so each user only sees their own profile/routine.
     - Add indexes for product name/brand search.
3. If you already had a `profiles` table and are missing `schedule_overrides`, you can also run `scripts/migrations/add-schedule-overrides.sql` once.

You do **not** need to create `auth.users`; Supabase creates and manages that table automatically when you enable Auth.

### 1.3 Enable Auth

1. In **Authentication → Providers**, enable Email/Password and/or OAuth.
2. As users sign up, Supabase will populate `auth.users`, which `profiles.id` and `routines.user_id` reference.

### 1.4 Supabase environment variables

Create `skincareconsultant/.env.local` and add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

These are your credentials. They are not committed to the repo, and they control exactly which Supabase project the app uses.

---

## 2. Neo4j (knowledge graph)

Neo4j stores the ingredient/concern knowledge graph used by:

- Compatibility (conflict detection).
- Routine insights (graph‑based conflicts/helps).
- Extra graph context for chat when a routine is provided.

### 2.1 Create a database

1. Sign up at [neo4j.com](https://neo4j.com) and create a database (Neo4j Aura Free or local).
2. Note:
   - `NEO4J_URI` (e.g. `neo4j+s://xxxx.databases.neo4j.io`).
   - `NEO4J_USER`.
   - `NEO4J_PASSWORD`.

### 2.2 Load the graph

The `combine-datasets` pipeline outputs a Cypher file you can feed into Neo4j:

1. From the repo root, run:
   ```bash
   npm run combine-datasets
   ```
   This generates graph and RAG inputs under `scripts/out/` (including a `graph.cypher` file).
2. In Neo4j Browser (or `cypher-shell`), paste and run the generated `graph.cypher` to create nodes and edges.

Once this is done, the app’s `/api/graph` endpoint and other graph‑using code can query Neo4j for `CONFLICTS_WITH` and `HELPS` edges.

### 2.3 Neo4j environment variables

Add to `skincareconsultant/.env.local`:

```env
NEO4J_URI=your_neo4j_uri
NEO4J_USER=your_neo4j_username
NEO4J_PASSWORD=your_neo4j_password
```

If these are missing, graph‑powered features (conflicts/helps, ingredient map, graph context for chat) will be skipped with clear warnings in logs, but the app will still run.

---

## 3. Pinecone + Gemini (RAG index)

Pinecone + Gemini power the semantic retrieval layer used by:

- Chat (RAG context).
- Goal alignment dimension in compatibility.

### 3.1 Create a Pinecone index

1. Go to [pinecone.io](https://www.pinecone.io) and create a new index.
2. Choose a dimension compatible with your embedding model (this repo uses Gemini embeddings; see `lib/gemini.ts`).
3. Note:
   - `PINECONE_API_KEY`.
   - `PINECONE_INDEX_HOST` (or `PINECONE_HOST`).

### 3.2 Get a Gemini API key

1. Create a Google AI / Gemini project and generate an API key.
2. Note `GEMINI_API_KEY`.

### 3.3 Ingest the RAG corpus

From the repo root:

```bash
npm run combine-datasets   # builds rag-ingredients.json and rag-products.json under scripts/out/
npm run rag-ingest         # embeds with Gemini and upserts to Pinecone
```

After this, Pinecone contains ingredient/product/guidance chunks with rich metadata. Chat and compatibility APIs will query that index at runtime.

### 3.4 Pinecone + Gemini environment variables

Add to `skincareconsultant/.env.local`:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_HOST=your_pinecone_index_host
GEMINI_API_KEY=your_gemini_api_key
```

If these are not set:

- Compatibility’s hard rules (avoid list + graph conflicts) still work, but goal alignment is skipped.
- Chat will return clear error messages about missing keys instead of silently failing.

---

## 4. First-time setup (local dev)

Here is the complete, practical sequence for running Skincare Consultant against your own backend:

1. **Clone and install**
   ```bash
   git clone https://github.com/Dr2Pathak/SkincareConsultant.git
   cd SkincareConsultant
   npm install
   ```
2. **Supabase**
   - Create a project.
   - Run `scripts/supabase-schema.sql` (and `scripts/migrations/add-schedule-overrides.sql` if needed) in the SQL Editor.
   - Enable Email/Password Auth.
3. **Neo4j**
   - Create a database.
   - Run `npm run combine-datasets`.
   - Load the generated `graph.cypher` into Neo4j.
4. **Pinecone + Gemini**
   - Create a Pinecone index.
   - Get a Gemini API key.
   - Run:
     ```bash
     npm run combine-datasets
     npm run rag-ingest
     ```
5. **Environment variables**
   - Copy `skincareconsultant/.env.example` → `skincareconsultant/.env.local`.
   - Fill in:
     - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
     - Neo4j: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`.
     - Pinecone: `PINECONE_API_KEY`, `PINECONE_INDEX_HOST`.
     - Gemini: `GEMINI_API_KEY`.
   - Set:
     ```env
     NEXT_PUBLIC_USE_MOCK=false
     ```
     so the app uses your backend instead of mock data.
6. **Run the app**
   ```bash
   npm run dev
   ```
   - Visit `http://localhost:3000`.
   - Sign up/sign in via Supabase Auth.
   - Build routines, check compatibility, use chat, and explore the calendar.

### Mock mode (no backend required)

If you only want to explore the UI without setting anything up:

- Leave `NEXT_PUBLIC_USE_MOCK=true` (or omit it).
- Run:
  ```bash
  npm run dev
  ```
- The app will:
  - Use mock profile, routines, and products.
  - Return mock compatibility/chat responses.
  - Skip any external calls to Supabase, Neo4j, Pinecone, or Gemini.

You can switch to real services later by filling in `.env.local` and flipping `NEXT_PUBLIC_USE_MOCK=false`.

---

## 5. Which services each feature uses

- **Chat (RAG + knowledge graph):** Each message is embedded with Gemini and queried against Pinecone; retrieved chunks are passed to the LLM. When the user’s current routine is sent, the backend also: (1) fetches product INCI from Supabase and queries **Neo4j** for `CONFLICTS_WITH` and `HELPS` among those ingredients, and injects that into the system prompt so suggestions are specific to their products; (2) runs a second RAG query using routine product names to pull in more relevant ingredient/product chunks. So chat uses both RAG (Pinecone) and the knowledge graph (Neo4j) when a routine is provided.
- **Chat latency notes (in-memory caches):** The chat API uses small in-memory TTL caches to reduce repeated work:
  - Pinecone RAG context (keyed by normalized message + routine hash).
  - Neo4j knowledge-context (keyed by routine hash only).
  These caches are per server instance (so they may be cold after deployments/cold starts).
- **Compatibility:** Product INCI lists are checked against the **Neo4j** graph (`CONFLICTS_WITH` edges) and the user’s profile `avoid_list`. Scores and “patch test recommended” / “not recommended” come from this.
- **Routine health:** The authenticated user’s routine is loaded; product INCI lists are used to compute exfoliation load and retinoid strength, and **Neo4j** is queried for `CONFLICTS_WITH` among those ingredients. The score and warnings (e.g. “Multiple exfoliants”, “Retinoid with exfoliants”) are derived from this.
- **Ingredient map:** The full **Neo4j** graph (nodes and edges) is served via `GET /api/graph` and shown as “Full graph”. “My routine” filters that graph to ingredients in the user’s routine plus connected nodes so they can see how their products relate.

For chat to work, you must set `GEMINI_API_KEY`, `PINECONE_API_KEY`, and `PINECONE_INDEX_HOST` (or `PINECONE_HOST`) and run RAG ingestion so Pinecone has data. If any of these are missing, the chat API returns 503 with a clear message (e.g. “GEMINI_API_KEY is not set…”).

### Which keys each feature uses

| Feature | Supabase | Neo4j | Pinecone | Gemini |
|--------|----------|-------|----------|--------|
| Auth, profiles, routines, products | ✓ | | | |
| Compatibility (avoid list + conflict score) | ✓ | ✓ | | |
| Routine health (exfoliation, retinoid, conflicts) | ✓ | ✓ | | |
| Ingredient map (knowledge graph) | | ✓ | | |
| Chat (RAG + optional graph) | ✓ (routine) | ✓ (routine) | ✓ | ✓ |

So:

- **Compatibility and routine health** use the graph (Neo4j) plus Supabase data.
- **Chat** uses Supabase (for routine), Neo4j (for conflicts/helps when available), Pinecone, and Gemini.
- If a service is missing, the app either degrades gracefully (e.g. no graph conflicts) or surfaces a clear error (e.g. missing Gemini key).
