import "@testing-library/jest-dom/vitest";

// Use mock data in tests so API (fetch) is never called (avoids relative URL errors in Node).
process.env.NEXT_PUBLIC_USE_MOCK = "true";
