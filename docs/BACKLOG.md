# Backlog / follow-up work

Items to revisit when implementing the backend or compatibility engine.

---

## Runtime: match product ingredients to graph nodes

**Context:** The combine-datasets pipeline normalizes product `inciList` with the same alias map used for the knowledge graph, but it does **not** guarantee every product ingredient has a corresponding graph node. At runtime the compatibility engine must resolve each `product.inciList` entry to a graph node so it can look up `conflicts_with`, `helps`, and the user’s avoid list.

**To do:**

1. **Resolve product INCI → graph node**  
   For each string in `product.inciList`, either:
   - Normalize and slug it (same rules as pipeline: `normalizeInci` + `toSlug`) and look up the graph node by `id`, or  
   - Match by label / fuzzy match if slug is not in the graph.

2. **Richer alias/synonym map (optional)**  
   Many product INCI strings (e.g. “Sodium Hyaluronate” vs “Hyaluronic Acid”) don’t share a graph node unless the alias map or runtime logic maps them to the same canonical ingredient. Consider:
   - Extending the pipeline’s alias map (e.g. from CosIng synonyms), or  
   - A runtime synonym table / lookup so product INCI resolves to a known graph node id.

3. **Where to implement**  
   In the backend service that computes compatibility: when given a product (with `inciList`) and user profile, resolve each INCI to graph nodes, then query Neo4j (or the graph API) for conflicts/helps and apply avoid-list rules.

**References:**  
- Pipeline: `scripts/combine-datasets/normalize-inci.ts` (`normalizeInci`, `toSlug`), `run.ts` (alias map from amaboh + CosIng).  
- App: `skincareconsultant/lib/mock-data.ts` `getCompatibilityResult` (uses `product.inciList` vs avoid list and hardcoded actives).  
- Types: `Product.inciList`, `GraphNode.id` / `label`, `KnowledgeGraph` in `lib/types.ts`.
