import { describe, it, expect } from "vitest";
import {
  mockProfile,
  mockProducts,
  mockRoutine,
  mockRoutineHealth,
  mockKnowledgeGraph,
  searchProducts,
  getCompatibilityResult,
} from "./mock-data";

describe("mock-data", () => {
  describe("mockProfile", () => {
    it("has required profile fields", () => {
      expect(mockProfile.skinTypes).toBeDefined();
      expect(Array.isArray(mockProfile.skinTypes)).toBe(true);
      expect(mockProfile.concerns).toBeDefined();
      expect(mockProfile.avoidList).toBeDefined();
      expect(["low", "medium", "high"]).toContain(mockProfile.tolerance);
    });
  });

  describe("mockProducts", () => {
    it("has at least one product with id, name, brand, inciList", () => {
      expect(mockProducts.length).toBeGreaterThan(0);
      const p = mockProducts[0];
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.brand).toBeDefined();
      expect(Array.isArray(p.inciList)).toBe(true);
    });
  });

  describe("mockRoutine", () => {
    it("has am and pm steps arrays", () => {
      expect(Array.isArray(mockRoutine.am)).toBe(true);
      expect(Array.isArray(mockRoutine.pm)).toBe(true);
    });
  });

  describe("searchProducts", () => {
    it("returns array of products for non-empty query", () => {
      const results = searchProducts("cleanser");
      expect(Array.isArray(results)).toBe(true);
    });

    it("returns empty array for empty query", () => {
      const results = searchProducts("");
      expect(results).toEqual([]);
    });
  });

  describe("getCompatibilityResult", () => {
    it("returns compatibility result with verdict and summary", () => {
      const result = getCompatibilityResult(mockProducts[0].id);
      expect(result).toBeDefined();
      expect(["ready", "patch_test", "not_recommended"]).toContain(result.verdict);
      expect(typeof result.summary).toBe("string");
      expect(Array.isArray(result.reasons)).toBe(true);
    });
  });

  describe("mockKnowledgeGraph", () => {
    it("has nodes and edges arrays", () => {
      expect(Array.isArray(mockKnowledgeGraph.nodes)).toBe(true);
      expect(Array.isArray(mockKnowledgeGraph.edges)).toBe(true);
    });
  });

  describe("mockRoutineHealth", () => {
    it("has score and warnings", () => {
      expect(typeof mockRoutineHealth.score).toBe("number");
      expect(Array.isArray(mockRoutineHealth.warnings)).toBe(true);
    });
  });
});
