# Backend setup: Supabase, Neo4j, Pinecone, Vercel

This doc describes what you need to run the skincare consultant with a real backend (Supabase, Neo4j, Pinecone) and deploy on Vercel. **Do not commit API keys or secrets.** Use environment variables and, in production, your host’s secret manager.

---

## 1. Supabase (auth + relational data)

**Use for:** User accounts, profiles, routines, and (optionally) product catalog.

### Steps

1. Create a project at [supabase.com](https://supabase.com).
2. In **Settings → API**: note **Project URL** and **anon (public) key**. For server-side code, use the **service_role** key only in a secure backend (never in the browser).
3. Create tables, for example:
   - **profiles:** id (uuid, FK to auth.users), skin_types (text[]), concerns (text[]), avoid_list (text[]), tolerance (text), updated_at
   - **routines:** id (uuid), user_id (uuid), name (text), am (jsonb), pm (jsonb), is_current (boolean), updated_at  
     - **Multiple routines per user:** The table must allow more than one row per user. If you have a UNIQUE constraint on `user_id`, drop it:  
       `ALTER TABLE routines DROP CONSTRAINT IF EXISTS routines_user_id_key;`  
     - For multiple saved routines and a "current" one: add `name` (default `'My routine'`) and `is_current` (default `true`). Run:  
       `ALTER TABLE routines ADD COLUMN IF NOT EXISTS name text DEFAULT 'My routine';`  
       `ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT true;`  
       `UPDATE routines SET is_current = true WHERE is_current IS NULL;`  
     - If saving a new routine fails with "duplicate key" / `routines_user_id_key`, run the DROP CONSTRAINT above. If it mentions `is_current` or `name`, run the ADD COLUMN migration.
   - **products** (if you store catalog here): id (text), name, brand, inci_list (text[] or jsonb), category, description
4. Enable Auth: Email/Password and/or OAuth (e.g. Google) in **Authentication → Providers**.
5. (Optional) Row Level Security (RLS): policies so each user only reads/writes their own profile and routine.

### Env vars (you add these in Vercel / .env.local)

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (safe for client)  
- `SUPABASE_SERVICE_ROLE_KEY` — only for server-side; never expose to client  

**I will need from you:** Supabase **Project URL** and **anon key** (and service role key if we add server-only APIs). Do not paste them here; add them in Vercel env and/or `.env.local` and tell me when they’re set.

---

## 2. Neo4j (knowledge graph)

**Use for:** Ingredient/family/concern nodes and relationships (belongs_to, helps, conflicts_with). The app’s compatibility and chat use this graph.

### Steps

1. Sign up at [neo4j.com](https://neo4j.com) and create a database (e.g. **Neo4j Aura Free**).
2. Note **connection URI** (e.g. `neo4j+s://xxxx.databases.neo4j.io`), **username** (often `neo4j`), and **password**.
3. Load the graph: run the generated `scripts/out/graph.cypher` in the Neo4j Browser (or cypher-shell) after running `npm run combine-datasets` (or `combine-datasets:no-download` with CSVs in place).
4. Your backend will expose something like `GET /api/graph` that runs a Cypher query and returns `{ nodes, edges }` in the shape expected by the frontend (`KnowledgeGraph`).

### Env vars

- `NEO4J_URI` — connection URI  
- `NEO4J_USER` — username  
- `NEO4J_PASSWORD` — password  

**I will need from you:** Neo4j **URI**, **username**, and **password** (or confirmation they’re set in env). Add them in Vercel as server-side env vars only.

---

## 3. Pinecone (vector store for RAG)

**Use for:** RAG retrieval over ingredient and product chunks. The combine-datasets pipeline outputs `rag-ingredients.json` and `rag-products.json`; a separate ingestion step embeds and upserts to Pinecone.

### Steps

1. Create an account and index at [pinecone.io](https://www.pinecone.io/).
2. Create an index with dimension matching your embedding model (e.g. 384 for `all-MiniLM-L6-v2`, 1536 for OpenAI `text-embedding-3-small`).
3. Note **API key** and **index host** (e.g. `xxxxx.svc.env.pinecone.io`).
4. RAG ingestion (separate script or job): read `rag-ingredients.json` and `rag-products.json`, chunk if needed, call your embedding API, upsert to the index with metadata (e.g. type: ingredient | product, id).
5. At runtime, the chat backend embeds the user query, queries Pinecone, and passes retrieved chunks to the LLM.

### Env vars

- `PINECONE_API_KEY` — API key  
- `PINECONE_INDEX_HOST` or `PINECONE_HOST` — index host  
- `GEMINI_API_KEY` — used by the ingestion script and chat API for embeddings and generation  

**Implemented:** RAG ingestion script (`npm run rag-ingest`) and chat API use Gemini `gemini-embedding-001` (3072 dim) and Pinecone. Add keys as server-side env vars.

---

## 4. Vercel (hosting)

**Use for:** Next.js app and serverless API routes.

### Steps

1. Connect your repo at [vercel.com](https://vercel.com).
2. Add all env vars above in **Project → Settings → Environment Variables**. Use **Production** (and optionally Preview) and never commit them.
3. Deploy. API routes will run on Vercel; they can call Supabase, Neo4j, and Pinecone using server-side env vars.

**No MCP for Vercel:** Deployment and env are done in the Vercel dashboard or via Vercel CLI (`vercel env pull`, etc.).

---

## 5. Checklist and order

1. **Supabase:** Create project, get URL + keys, create tables (profiles, routines, products if needed), enable Auth.  
2. **Neo4j:** Create DB, get URI + user + password, load `graph.cypher` from pipeline output.  
3. **Pinecone:** Create index, get API key + host; later add RAG ingestion and wire chat to query Pinecone.  
4. **Vercel:** Connect repo, add env vars, deploy.  
5. **App:** Switch from mock to API (e.g. `NEXT_PUBLIC_USE_MOCK=false`) and ensure API routes implement `getProfile`, `getRoutine`, `getProduct`, `searchProducts`, `getCompatibility`, `getKnowledgeGraph`, `getRoutineHealth`, `sendChatMessage`.

When you have keys/URLs ready, add them in Vercel (and optionally `.env.local` for dev) and tell me which are set so we can wire the app without you pasting secrets in chat.

---

## First-time setup (app already wired)

1. **Env:** Copy `skincareconsultant/.env.example` to `skincareconsultant/.env.local` and fill in your Supabase, Neo4j, Pinecone, and Gemini keys. Do not commit `.env.local`.
2. **Supabase:** In the Supabase SQL Editor, run `scripts/supabase-schema.sql` to create `profiles`, `routines`, and `products` tables.
3. **Load data:** From repo root (with env in `.env.local`):  
   `npm run load-products` (loads `scripts/out/products.json` into Supabase),  
   `npm run load-graph` (loads `scripts/out/graph.cypher` into Neo4j),  
   `npm run rag-ingest` (embeds `rag-ingredients.json` + `rag-products.json` with Gemini and upserts to Pinecone).  
   Ensure `npm run combine-datasets` has been run first so `scripts/out/` exists.
4. **Use backend:** Set `NEXT_PUBLIC_USE_MOCK=false` in `.env.local` and run `npm run dev`. Profile, routine, products, graph, compatibility, routine-health, and chat will use Supabase, Neo4j, and Pinecone/Gemini.

---

## How RAG and the knowledge graph are used (education & optimization)

- **Chat (RAG + knowledge graph):** Each message is embedded with Gemini and queried against Pinecone; retrieved chunks are passed to the LLM. When the user’s current routine is sent, the backend also: (1) fetches product INCI from Supabase and queries **Neo4j** for `CONFLICTS_WITH` and `HELPS` among those ingredients, and injects that into the system prompt so suggestions are specific to their products; (2) runs a second RAG query using routine product names to pull in more relevant ingredient/product chunks. So chat uses both RAG (Pinecone) and the knowledge graph (Neo4j) when a routine is provided.
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

So: **compatibility and routine health use the knowledge graph (Neo4j)**, not RAG. If Neo4j keys are missing, you still get compatibility/health but without conflict detection; chat still works with RAG only but won’t include graph-based conflicts/helps for the user’s routine. If Supabase is missing, profile/routine/product APIs fail. **Chat requires Pinecone + Gemini;** with a routine and Neo4j configured, it also gets product-specific graph context.

**Check your config:** `GET /api/health` returns which services are configured (no secrets). Call it to see e.g. `{ "services": { "supabase": "ok", "neo4j": "missing", ... }, "message": "Missing: Neo4j" }`.
