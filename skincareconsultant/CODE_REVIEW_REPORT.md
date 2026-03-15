# Production-Level Code Review: Skincare Consultant

**Scope:** `skincareconsultant/` (app/, components/, lib/, hooks/), root config.  
**Conventions:** global-standards.mdc, frontend.mdc, api-and-services.mdc, data-and-ingredients.mdc.

---

## Critical (must fix before production)

### 1. Broken product detail route

**Issue:** The app links to `/product/{id}` in two places, but no such route exists.

**Files:**
- `app/product-check/page.tsx` (line 177): "View Full Product Details" → `/product/${selectedProduct.id}`
- `components/product-card.tsx` (line 104): "View Details" → `/product/${product.id}`

**Fix:** Either add the route or remove/change the links.

- **Option A – Add route:** Create `app/product/[id]/page.tsx` that loads product by id (e.g. from mock-data or future API), shows details + disclaimer, and handles not-found.
- **Option B – Temporary:** Replace links with `href="/product-check"` or a product-check query (e.g. `/product-check?productId=...`) and add a note to implement the detail page later.

---

### 2. API layer: no error logging with context

**Issue:** Global standards require: "Log errors with context (e.g. user id, product id). Never swallow errors."

**File:** `lib/api.ts`

- All functions throw on `!res.ok` and do not log.
- When the backend is wired, failed requests will throw without server-side logs (no request URL, productId, etc.).

**Fix:** Log before throwing and surface a safe user message.

Example for `getCompatibility`:

```ts
export async function getCompatibility(productId: string): Promise<unknown> {
  const url = `${API_BASE}/api/compatibility?productId=${encodeURIComponent(productId)}`
  const res = await fetch(url)
  if (!res.ok) {
    const errMsg = `Compatibility fetch failed: ${res.status} productId=${productId}`
    console.error(errMsg, { productId, status: res.status })
    throw new Error("We couldn’t check this product right now. Please try again.")
  }
  return res.json()
}
```

Apply the same pattern (log with context, throw safe message) to `getProfile`, `getRoutine`, `searchProducts`, and `sendChatMessage`. Ensure callers catch and show the message instead of swallowing errors.

---

## Warnings (should fix)

### 3. Duplicate `generateId` logic

**Issue:** Same helper implemented in two pages.

**Files:**
- `app/chat/page.tsx` (lines 10–12)
- `app/routine/page.tsx` (lines 12–14)

**Fix:** Move to a shared util, e.g. `lib/utils.ts`:

```ts
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
```

Then import in both pages and remove the local definitions.

---

### 4. Chat: scroll-to-bottom likely ineffective

**Issue:** Chat passes `ref={scrollRef}` to `ScrollArea` and then sets `scrollRef.current.scrollTop` / `scrollHeight`. `ScrollArea` does not forward a ref to the scrollable viewport, so `scrollRef.current` may be null or not the viewport element; scroll-to-bottom may never run.

**File:** `app/chat/page.tsx` (lines 44, 46–50, 93)

**Fix:** Put the ref on the scrollable content wrapper (the viewport) instead of `ScrollArea`. For example, wrap the messages in a div that has the ref and is the one that scrolls, or use a ref on the inner viewport if the UI component exposes it. Example pattern:

```tsx
<div ref={scrollRef} className="flex-1 overflow-auto pr-4">
  <div className="space-y-4 pb-4">
    {messages.map(...)}
  </div>
</div>
```

If you keep `ScrollArea`, ensure the ref is attached to the element that actually has `scrollTop`/`scrollHeight` (e.g. by wrapping its children in a div with the ref and making that div the scroll container, or by using the viewport ref if the component provides it).

---

### 5. API return types are `unknown`

**Issue:** `lib/api.ts` returns `Promise<unknown>` for all functions. When pages switch from mock-data to these APIs, type safety is lost and the API shape is not enforced.

**Fix:** Use shared types from `lib/types.ts` and return typed promises, e.g.:

- `getProfile(): Promise<UserProfile>`
- `getRoutine(): Promise<Routine>`
- `searchProducts(query: string): Promise<Product[]>`
- `getCompatibility(productId: string): Promise<CompatibilityResult>`
- `sendChatMessage(message: string): Promise<{ reply: string }>` (or whatever the backend returns)

Add runtime validation (e.g. Zod) on `res.json()` if the backend is not fully trusted.

---

### 6. Accessibility: product Select and Add Step button

**Issue:** Routine step editor product dropdown and "Add Step" are not clearly labeled for screen readers.

**Files:**
- `components/routine/routine-step-editor.tsx`: `Select`/`SelectTrigger` have placeholder "Select product" but no `aria-label`.
- `AddStepButton`: no `aria-label`.

**Fix:**

- On the Select (or SelectTrigger), add `aria-label="Select product for this step"` (or use an associated `<Label>` with `htmlFor` if the component supports it).
- On `AddStepButton`: add `aria-label="Add step to routine"` (and keep visible text "Add Step" for sighted users).

---

### 7. Routine health and graph list keys

**Issue:** Using array index as key can cause unnecessary re-renders or focus issues when the list changes.

**Files:**
- `components/routine/routine-health.tsx` (line 102): `key={index}` for warnings.
- `components/graph/graph-visualization.tsx` (line 251): `key={index}` for edges.

**Fix:** Prefer stable keys: e.g. `key={`${warning.type}-${warning.message}`}` (or include `details` if needed for uniqueness), and for edges something like `key={`${edge.from}-${edge.to}-${edge.type}`}`.

---

## Suggestions (consider)

### 8. Input validation and limits

- **Product search** (`app/product-check/page.tsx`): Consider capping query length (e.g. 200 characters) to avoid abuse and very long "No products found" text.
- **Chat** (`components/chat/chat-message.tsx` / chat page): Consider a max length for the message input (e.g. 2000 characters) and optionally show remaining count.
- **Onboarding avoid list** (`app/onboarding/page.tsx`): Consider a max number of items and/or max length per ingredient string so the list stays manageable and storage-safe.

---

### 9. ESLint and Next.js

**File:** `eslint.config.mjs`

Currently uses `@eslint/js` and `typescript-eslint` only. Adding `eslint-config-next` would bring Next-specific rules (e.g. correct `next/link`/`next/image` usage, no `<img>` where `next/image` is preferred). Optional but recommended for production.

---

### 10. Onboarding persistence and errors

**File:** `app/onboarding/page.tsx`

`handleComplete` only `console.log`s profile data and navigates. For production:

- Persist via API (or at least localStorage) and show a loading/error state.
- On API failure, log with context (e.g. user id if available) and show a safe message ("We couldn’t save your profile. Please try again.") instead of silently failing.

---

### 11. Ingredient highlight list key

**File:** `components/compatibility/ingredient-highlight-list.tsx` (line 108)

Key is `${note.ingredientName}-${index}`. If the list can have duplicate ingredient names with different notes, this is fine. For more stable keys you could use `${note.ingredientName}-${note.note}` (or a hash) to avoid index dependency.

---

## What’s already in good shape

- **Types:** `lib/types.ts` defines profile, routine, product, compatibility, and graph types; aligned with described backend boundaries.
- **Secrets:** No API keys or credentials in code; `lib/api.ts` uses `process.env.NEXT_PUBLIC_API_URL` for the base URL.
- **Disclaimers:** Shared `Disclaimer` is used on product-check, chat, onboarding (avoid list), and ingredients; footer includes educational disclaimer; wording matches safety-and-disclaimers expectations (guidance only, patch test, not medical advice).
- **Compatibility UX:** Product-check uses `VerdictCard`, `ExpandableExplanation`, and `IngredientHighlightList` with actionable verdicts and expandable, ingredient-level explanation.
- **Semantic HTML and a11y:** Good use of sections, headings, `aria-label`, `aria-expanded`, `aria-controls`, `role="status"`, `sr-only` labels, and keyboard-friendly controls in compatibility and chat.
- **Config:** `tsconfig.json` has `strict: true`; `package.json` has lint, typecheck, and test scripts; Husky is set up at repo root.

---

## Summary

| Priority   | Count | Action |
|-----------|--------|--------|
| Critical  | 2     | Add product detail route or change links; add error logging with context in `lib/api.ts` and safe user messages. |
| Warnings  | 5     | Deduplicate `generateId`; fix chat scroll ref; type API returns; add aria-labels for routine Select/Add Step; use stable keys for routine health and graph lists. |
| Suggestions | 4  | Input limits (search, chat, avoid list); consider eslint-config-next; onboarding persistence and error handling; optional key improvement for ingredient list. |

The codebase is close to production-ready. Addressing the two critical items and the listed warnings will align it with project conventions and improve reliability and accessibility.
