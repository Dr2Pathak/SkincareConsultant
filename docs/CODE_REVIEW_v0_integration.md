# Code review: v0 integration (skincare consultant)

**Reviewer:** Code-reviewer checklist + frontend.mdc + global-standards.

## Summary

- **Verdict:** Ready for production use with mock data. No critical or security issues. A few minor improvements suggested.
- **Backend readiness:** Types in `lib/types.ts` and mock data in `lib/mock-data.ts` align with planned REST API. `lib/api.ts` added as placeholder for future fetch calls.

## Checklist

| Item | Status |
|------|--------|
| Clear naming and structure | Pass – app/, components/, lib/ are well organized |
| No duplicated logic | Pass – shared components (Disclaimer, VerdictCard, etc.) |
| Error handling | Pass – client-only; no backend yet. Add try/catch when wiring api.ts |
| No secrets in client | Pass – no API keys or credentials in code |
| Input validation | Pass – form inputs and search trimmed/guarded |
| User-facing disclaimers | Pass – onboarding (avoid list), chat footer, product-check result (Disclaimer near verdict) |
| No medical claims | Pass – copy is guidance-only; Disclaimer component used |
| Compatibility UX | Pass – actionable verdict (Ready / Patch test / Not recommended), VerdictCard, ExpandableExplanation, IngredientHighlightList |
| Accessibility | Pass – semantic HTML (section, article, h1/h2), aria-label on verdict and inputs, sr-only where needed |

## Warnings (should fix when touching code)

1. **Analytics:** `@vercel/analytics` is included. Ensure analytics consent is handled if required (e.g. GDPR). No code change required for current scope.
2. **Routine page:** Button links use `<a href="...">` inside `<Button asChild>`. Correct; ensure focus styles remain visible for keyboard users (shadcn default is fine).

## Suggestions

1. When connecting the backend, replace `getCompatibilityResult(product.id)` (and similar) in product-check and chat with `getCompatibility(product.id)` from `lib/api.ts`, and add error boundaries or toast on failure.
2. Consider adding a simple error boundary at app level so a single page error does not blank the whole app.

## Frontend rule alignment (frontend.mdc)

- v0/shadcn patterns followed; structure preserved.
- Compatibility UX: actionable verdict, expandable explanation, ingredient highlights – implemented.
- Accessibility: semantic HTML, labels, keyboard – implemented.
- No medical claims; disclaimers present.
