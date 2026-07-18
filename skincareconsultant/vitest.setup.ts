import "@testing-library/jest-dom/vitest";
import { cleanup, act } from "@testing-library/react";
import { afterEach } from "vitest";

// Use mock data in tests so API (fetch) is never called (avoids relative URL errors in Node).
process.env.NEXT_PUBLIC_USE_MOCK = "true";
process.env.OTEL_DISABLED = "1";

/**
 * React 19's scheduler can flush work after jsdom is torn down, which surfaces as
 * "window is not defined" unhandled errors and fails CI even when assertions pass.
 * Flush microtasks + cleanup after every test.
 */
afterEach(async () => {
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });
  cleanup();
});
