import { defineConfig } from "vitest/config";

process.env.LOG_LEVEL ??= "silent";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    // Runs before every test file; stubs out live Stripe API calls so the
    // suite never hits the network and doesn't need real credentials in CI.
    globalSetup: ["src/test/global-setup.ts"],
    setupFiles: ["src/test/setup.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
    // Authorization tests hit the real database and mutate/read shared
    // tables; run files sequentially to avoid cross-test interference.
    fileParallelism: false,
  },
});
