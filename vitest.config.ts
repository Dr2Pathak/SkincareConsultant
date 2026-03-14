import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["skincareconsultant/**/*.test.ts", "skincareconsultant/**/*.spec.ts"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./skincareconsultant"),
    },
  },
});
