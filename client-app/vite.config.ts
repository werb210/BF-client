import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_URL;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@twilio/voice-sdk": path.resolve(__dirname, "src/shims/twilio-voice-sdk.ts"),
      },
    },
    build: {
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
      ...(apiProxyTarget
        ? {
            proxy: {
              "/api": {
                target: apiProxyTarget,
                changeOrigin: true,
              },
            },
          }
        : {}),
    },
  };
});
