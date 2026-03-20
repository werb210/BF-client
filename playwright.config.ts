import { defineConfig } from '@playwright/test'

export default defineConfig({
  use: {
    baseURL: 'http://localhost:5173'
  },
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: true
    },
    {
      command: 'cd ../BF-server && TEST_MODE=true npm run start:test',
      port: 3000,
      reuseExistingServer: true
    }
  ]
})
