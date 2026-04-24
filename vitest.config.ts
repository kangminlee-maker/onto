import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/core-runtime/{scope-runtime,readers,evolve,learning,review,discovery,govern,cli,translate,onboard,config,install}/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    testTimeout: 30000,
  },
});
