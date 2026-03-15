# Combined dataset pipeline

This pipeline merges Kaggle (and optional CosIng) CSVs into normalized **products** and a **knowledge graph**, then writes artifacts for Supabase, Neo4j, and RAG (Pinecone).

## Prerequisites

- Node 18+
- **Kaggle CLI** (for auto-download): `pip install kaggle` and ensure `kaggle` is on your PATH.
- **Kaggle credentials** — use one of:
  - **Recommended:** Place `kaggle.json` in your **user profile**, not on Desktop:
    - **Windows:** `C:\Users\<YourUsername>\.kaggle\kaggle.json` (create the `.kaggle` folder under `%USERPROFILE%` if needed).
    - **macOS/Linux:** `~/.kaggle/kaggle.json`
    - File format: `{"username": "your_kaggle_username", "key": "your_key_or_KGAT_token"}`. From [Kaggle → Create New API Token](https://www.kaggle.com/settings), you can use the new API token as `key`. Do **not** commit this file.
  - Or set env: `KAGGLE_USERNAME` and `KAGGLE_KEY` (or `KAGGLE_API_TOKEN` as the key).
- Or skip download: use `--no-download` and place CSVs manually under `scripts/data/raw/` (see below).

## Datasets used

| Source | Kaggle dataset | Purpose |
|--------|----------------|--------|
| Ingredients (renude-style) | `amaboh/skin-care-product-ingredients-inci-list` | Ingredient nodes, "helps" edges, RAG text |
| CosIng | `amaboh/cosing-ingredients-inci-list` | Canonical INCI, functions → families |
| Products | `autumndyer/skincare-products-and-ingredients` (or others in config) | Product rows with inciList |

Columns used:
- **Amaboh ingredients:** `name`, `who_should_avoid`, `who_is_it_good_for`, `what_does_it_do`, `what_is_it`, `short_description`, `scientific_name`
- **CosIng:** INCI name column, optional functions column
- **Products:** `name` / `product_name` / `cosmetic_name`, `brand` / `brand_name`, and an ingredients column (`ingredients`, `Ingredients`, `inci`, `ingredient_list`). Multi-line ingredient cells (e.g. Sephora) are handled by taking the line that looks most like an INCI list.

## Config

Edit `scripts/combine-datasets/config.json` (paths relative to repo root):

- `rawDataDir`: where CSVs live (or where Kaggle downloads go)
- `curatedRulesPath`: path to `curated_rules.json`
- `outputDir`: where to write `products.json`, `nodes.json`, `edges.json`, `graph.cypher`, `rag-*.json`
- `kaggle`: dataset slugs for auto-download (optional)

## Curated rules

`scripts/data/curated_rules.json` defines:

- **conflicts_with:** `[{ "from": "nodeId", "to": "nodeId" }]` — e.g. retinol ↔ AHA
- **belongs_to:** `[{ "ingredient": "ingredientId", "family": "familyId" }]` — e.g. niacinamide → antioxidants

Node IDs are slugs (lowercase, hyphens). Add or edit entries to match your graph nodes.

## Commands (from repo root)

```bash
# Download Kaggle data (if credentials set) and run full pipeline
npm run combine-datasets

# Use existing files in scripts/data/raw only (no Kaggle download)
npm run combine-datasets:no-download

# Run without writing files (dry run)
npm run combine-datasets:dry-run
```

Or: `npx tsx scripts/combine-datasets/run.ts [--no-download] [--dry-run]`

## Where the data goes

- **Downloaded Kaggle data (raw CSVs):** under **`scripts/data/raw/`** in subfolders:
  - `amaboh-ingredients/` — skin-care-product-ingredients dataset
  - `cosing/` — CosIng ingredients dataset
  - `products-0/` — first product dataset in config, etc.
- **Pipeline outputs:** **`scripts/out/`** (or whatever you set as `outputDir` in config): `products.json`, `nodes.json`, `edges.json`, `graph.cypher`, `rag-ingredients.json`, `rag-products.json`.

So: raw data lives in the repo under `scripts/data/raw/` (that folder is in `.gitignore`); final artifacts for Supabase/Neo4j/RAG go to `scripts/out/`.

## Outputs

Written to `scripts/out/` (or your `outputDir`):

| File | Content | Use |
|------|--------|-----|
| `products.json` | `Product[]` (id, name, brand, inciList, category?, description?) | Seed Supabase products table |
| `nodes.json` | `GraphNode[]` (id, label, type) | Neo4j or API |
| `edges.json` | `GraphEdge[]` (from, to, type) | Neo4j or API |
| `graph.cypher` | MERGE/MATCH statements | Run in Neo4j Browser or cypher-shell |
| `rag-ingredients.json` | Chunks with id, text, metadata | RAG ingestion → Pinecone |
| `rag-products.json` | Chunks with id, text, metadata | RAG ingestion → Pinecone |

## Loading into backends

- **Supabase:** Create a `products` table matching `Product` (id, name, brand, inci_list JSON or array, category, description). Use a seed script or Supabase SQL to INSERT from `products.json`.
- **Neo4j:** Run the generated `graph.cypher` in Neo4j Browser (or cypher-shell). The script uses MERGE so re-runs are idempotent.
- **Pinecone:** A separate RAG ingestion step should read `rag-ingredients.json` and `rag-products.json`, chunk if needed, generate embeddings, and upsert to your Pinecone index. This pipeline does not call any embedding API.

## Tests

From repo root:

```bash
npm run test:scripts
```

Runs unit tests for normalizer, curated rules loader, graph builder, and products builder.
