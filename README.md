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
- **.husky/** — Git hooks (lint + typecheck on commit, test on push).
- **docs/** — [INTEGRATE_V0.md](docs/INTEGRATE_V0.md) explains how to drop a v0 zip into `skincareconsultant/` and keep scripts/hooks working.

## Commands (from root)

| Command        | Runs in workspace      |
|----------------|------------------------|
| `npm run dev`  | Next.js dev server     |
| `npm run build`| Next.js build          |
| `npm run start`| Next.js production     |
| `npm run lint` | ESLint (Next + core-web-vitals) |
| `npm run typecheck` | `tsc --noEmit`   |
| `npm run test` | Vitest                 |

## Integrating a v0 export

See **[docs/INTEGRATE_V0.md](docs/INTEGRATE_V0.md)** for step-by-step instructions to unzip a v0 frontend into `skincareconsultant/` and keep lint/typecheck/test and hooks working.
