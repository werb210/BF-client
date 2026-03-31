export { sendOtp, verifyOtp } from '@/api/auth'

// Minimal compatibility layer for tests

export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token: string) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

export function hasToken() {
  return !!localStorage.getItem('token')
}

export function initAuth() {
  const token = getToken()
  if (!token) clearToken()
}
