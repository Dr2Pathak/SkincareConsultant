# Skincare Consultant

Routine-centric skincare compatibility and guidance web app. Frontend is built with Next.js (v0-ready); backend and RAG are planned.

## Quick start

From the repo root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pre-commit runs lint + typecheck; pre-push runs tests.

## Structure

- **skincareconsultant/** — Next.js 15 App Router frontend (Tailwind). Replace or merge with a v0 export when ready.
- **scripts/combine-datasets/** — Pipeline to combine Kaggle datasets into products and knowledge graph; outputs for Supabase, Neo4j, and RAG. See [scripts/combine-datasets/README.md](scripts/combine-datasets/README.md).
- **.husky/** — Git hooks (lint + typecheck on commit, test on push).
- **docs/** — [INTEGRATE_V0.md](docs/INTEGRATE_V0.md).

## Commands (from root)

| Command        | Runs in workspace      |
|----------------|------------------------|
| `npm run dev`  | Next.js dev server     |
| `npm run build`| Next.js build          |
| `npm run start`| Next.js production     |
| `npm run lint` | ESLint (Next + core-web-vitals) |
| `npm run typecheck` | `tsc --noEmit`   |
| `npm run test` | Vitest                 |
| `npm run combine-datasets` | Download Kaggle data and build products + graph |
| `npm run combine-datasets:dry-run` | Run pipeline without writing files |
| `npm run test:scripts` | Vitest for scripts/combine-datasets |

## Backend and data pipeline

- **Data pipeline:** [scripts/combine-datasets/README.md](scripts/combine-datasets/README.md) — combine Kaggle datasets, output `products.json`, graph (nodes/edges/Cypher), and RAG-ready JSON.

## Integrating a v0 export

See **[docs/INTEGRATE_V0.md](docs/INTEGRATE_V0.md)** for step-by-step instructions to unzip a v0 frontend into `skincareconsultant/` and keep lint/typecheck/test and hooks working.
