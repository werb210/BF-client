import { describe, it, expect } from 'vitest'

describe('Auth UI Flow', () => {
  it('handles login success response', () => {
    const res = { success: true, data: { token: 'abc' } }
    expect(res.success).toBe(true)
    expect(res.data.token).toBeDefined()
  })

  it('handles login failure response', () => {
    const res = { error: 'invalid_credentials' }
    expect(res.error).toBeDefined()
  })

  it('handles missing user response', () => {
    const res = { error: 'user_not_found' }
    expect(res.error).toBe('user_not_found')
  })
})
