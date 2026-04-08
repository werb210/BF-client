import { afterAll, afterEach, vi } from 'vitest'

process.env.VITE_API_URL = 'http://test'

process.on('beforeExit', () => {
  console.log('PROCESS_EXITING')
})

afterEach(() => {
  // keep deterministic test isolation
})

afterAll(() => {
  vi.clearAllMocks()
  vi.resetModules()
})
