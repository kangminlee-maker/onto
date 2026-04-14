import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/core-runtime/{scope-runtime,readers,design,learning,review}/**/*.test.ts"],
    testTimeout: 30000,
  },
});
