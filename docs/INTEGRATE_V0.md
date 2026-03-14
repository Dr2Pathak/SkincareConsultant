# Integrating a v0 Export (Frontend)

This repo is set up so you can drop a **v0 (Vercel) frontend export** into `skincareconsultant/` and keep hooks, scripts, and dev flow working.

## Current structure

- **Repo root:** `package.json` (workspaces + Husky), `.husky/` (pre-commit: lint + typecheck; pre-push: test). All commands run in the `skincareconsultant` workspace.
- **skincareconsultant/:** Next.js 15 App Router app with Tailwind. This is the **frontend app** directory. Replace or merge its contents with your v0 export.

## How to integrate a v0 zip

1. **Unzip the v0 export** so that its contents end up **inside** `skincareconsultant/`:
   - If the zip has a single folder (e.g. `my-app/`), put that folder’s **contents** into `skincareconsultant/` (so `skincareconsultant/app/`, `skincareconsultant/components/`, etc.).
   - If the zip root is the app (e.g. `app/`, `package.json` at top level), unzip into `skincareconsultant/` so those files live there.

2. **Merge or replace `skincareconsultant/package.json`:**
   - If v0’s zip includes a `package.json`, merge it with the existing one (or replace and then add back any scripts below).
   - Ensure these scripts exist so root hooks keep working:
     - `"lint": "eslint . --max-warnings 0"` (or `next lint` if you prefer)
     - `"typecheck": "tsc --noEmit"`
     - `"test": "vitest run"` (use `"passWithNoTests": true` in vitest config if you have no tests yet)

3. **Install from repo root:**
   ```bash
   cd /path/to/Skincare
   npm install
   ```

4. **Run the app from root:**
   ```bash
   npm run dev
   ```
   This runs `next dev` in `skincareconsultant/`.

5. **Hooks:** Pre-commit runs `npm run lint` and `npm run typecheck` (in the workspace). Pre-push runs `npm run test`. All run from root and delegate to `skincareconsultant`, so no change needed after integrating v0.

## If v0’s structure differs

- **Different Next.js version:** Update `next` and `react` in `skincareconsultant/package.json` to match v0’s versions if you hit build or runtime issues.
- **Different config names:** If v0 uses `next.config.js` instead of `next.config.mjs`, that’s fine; keep one or the other. Same for `tailwind.config.js` vs `tailwind.config.ts`.
- **Missing scripts:** If v0’s `package.json` has no `typecheck` or `test`, add:
  - `"typecheck": "tsc --noEmit"`
  - `"test": "vitest run"`
  and add a minimal `vitest.config.ts` with `passWithNoTests: true` if you don’t have tests yet.

## Summary

Unzip v0 into `skincareconsultant/` → keep or add `lint` / `typecheck` / `test` in `skincareconsultant/package.json` → `npm install` at repo root → use `npm run dev`, `npm run lint`, etc. from root. Hooks will continue to run the same way.
