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
    testTimeout: 10000,
    hookTimeout: 10000,
    sequence: {
      shuffle: false
    },
    setupFiles: [fileURLToPath(new URL('./src/test/setup.ts', import.meta.url))]
  }
})
