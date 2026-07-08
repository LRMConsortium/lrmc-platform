import { defineConfig } from "vitest/config";

process.env.LOG_LEVEL ??= "silent";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
    // Authorization tests hit the real database and mutate/read shared
    // tables; run files sequentially to avoid cross-test interference.
    fileParallelism: false,
  },
});
