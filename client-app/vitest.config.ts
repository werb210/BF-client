import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: ".",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",

    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules",
      "dist",
      "../../**",
      "../../../**",
    ],
  },
});
