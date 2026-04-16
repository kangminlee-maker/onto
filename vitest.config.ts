import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/core-runtime/{scope-runtime,readers,evolve,learning,review,discovery,govern,cli}/**/*.test.ts"],
    testTimeout: 30000,
  },
});
