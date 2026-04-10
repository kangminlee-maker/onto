import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/core-runtime/{scope-runtime,readers,design}/**/*.test.ts"],
    testTimeout: 30000,
  },
});
