import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupEnv.ts', './src/test/setup.ts'],
    globals: true,
  },
});
