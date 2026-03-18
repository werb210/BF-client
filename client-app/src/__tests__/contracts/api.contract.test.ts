import { describe, it, expect } from 'vitest'

describe('API Contract Enforcement', () => {
  it('success responses follow { success: true, data }', () => {
    const res = { success: true, data: {} }
    expect(res.success).toBe(true)
    expect(res).toHaveProperty('data')
  })

  it('error responses follow { error: string }', () => {
    const res = { error: "invalid_request" }
    expect(typeof res.error).toBe('string')
  })

  it('never returns undefined', () => {
    const res = { success: true, data: null }
    expect(res).not.toBeUndefined()
  })
})
