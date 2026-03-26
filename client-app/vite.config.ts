import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    sourcemap: true,
    minify: false,
    target: 'es2020',
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  resolve: {
    alias: {
      '@': '/src',
      '@twilio/voice-sdk': path.resolve(__dirname, 'src/shims/twilio-voice-sdk.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
}));
