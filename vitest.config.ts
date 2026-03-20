import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts?(x)'],
    exclude: [
      'node_modules',
      'dist',
      'e2e',
      'playwright',
      '**/*.e2e.*',
      '**/playwright/**'
    ]
  }
})
