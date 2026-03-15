import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    include: ["./**/*.test.ts"],
    environment: "node",
    globals: true,
  },
  root: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../skincareconsultant"),
    },
  },
})
