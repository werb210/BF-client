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
    setupFiles: ["./src/__tests__/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    env: {
      VITE_API_URL: "",
    },
    environmentOptions: {
      jsdom: {
        url: "http://localhost",
      },
    },
  },
});
