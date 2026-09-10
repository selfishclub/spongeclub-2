import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      GTM_DB_PATH: ":memory:",
    },
  },
});
