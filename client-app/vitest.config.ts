import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    watch: false,
    threads: false,
    isolate: true,
    passWithNoTests: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    retry: 0,
    sequence: {
      shuffle: false
    },
    setupFiles: [
      fileURLToPath(new URL('./src/test/env.setup.ts', import.meta.url)),
      fileURLToPath(new URL('./src/test/setup.ts', import.meta.url))
    ]
  }
})
