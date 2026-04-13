import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/core-runtime/{scope-runtime,readers,design,learning}/**/*.test.ts"],
    testTimeout: 30000,
  },
});
