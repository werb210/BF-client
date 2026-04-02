import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    environmentOptions: {
    },
  },
});
