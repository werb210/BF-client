import { afterAll, afterEach, vi } from 'vitest'

// BF_CLIENT_TEST_REPAIR_v1 - jsdom does not implement Element.scrollIntoView.
// MiniPortalPage calls el?.scrollIntoView(...); optional chaining guards a null
// element but not a missing method, so the call threw and took down four tests
// in MiniPortalPage.spec.tsx. Stub it once here rather than in each test.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

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
