import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@twilio/voice-sdk": path.resolve(__dirname, "src/shims/twilio-voice-sdk.ts"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    target: "es2020",
  },
  esbuild: {
    drop: ["console", "debugger"],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
