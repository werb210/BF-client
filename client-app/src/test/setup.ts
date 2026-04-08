import { afterAll, afterEach, vi } from 'vitest'

const originalSetTimeout = globalThis.setTimeout
const trackedTimeouts = new Set<ReturnType<typeof setTimeout>>()

globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
  const timeoutId = originalSetTimeout(...args)
  trackedTimeouts.add(timeoutId)
  return timeoutId
}) as typeof globalThis.setTimeout

const originalClearTimeout = globalThis.clearTimeout
globalThis.clearTimeout = ((id?: ReturnType<typeof setTimeout>) => {
  if (id) {
    trackedTimeouts.delete(id)
  }
  return originalClearTimeout(id)
}) as typeof globalThis.clearTimeout

afterEach(() => {
  // keep deterministic test isolation
})

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  for (const timeoutId of trackedTimeouts) {
    originalClearTimeout(timeoutId)
  }
  trackedTimeouts.clear()
  vi.clearAllMocks()
  vi.resetModules()
  vi.restoreAllMocks()
  console.log('TESTS_DONE')
})

if (process.env.CI) {
  process.on('beforeExit', () => {
    process.exit(0)
  })
}
