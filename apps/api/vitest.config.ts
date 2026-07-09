import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      SKIP_STRIPE: "true",
      SKIP_QUEUES: "true",
      JWT_SECRET: "test-secret",
      DATABASE_URL: "postgresql://yaas:yaas@localhost:5432/yaas",
    },
  },
});
