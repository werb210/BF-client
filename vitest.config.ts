import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,

    include: ['src/__tests__/**/*.test.{ts,tsx}'],

    exclude: [
      'node_modules',
      'dist',
      'e2e',
      'playwright',
      '**/*.spec.ts',
      '**/*.spec.tsx'
    ]
  }
});
