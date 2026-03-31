import { apiRequest } from "./apiClient"
import { saveToken } from "@/services/token"
import { clearToken as clearStoredToken, getToken as getStoredToken, setToken as setStoredToken } from "@/auth/token"

let currentUser: any = null

export const clearToken = clearStoredToken

export function setToken(token: string) {
  saveToken(token)
  setStoredToken(token)
}

export function getToken() {
  return getStoredToken()
}

export async function initAuth() {
  try {
    currentUser = await apiRequest("/api/auth/me")
  } catch {
    clearToken()
    currentUser = null
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  }
}

export async function startOtp(phone: string) {
  return apiRequest("/api/auth/start-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  })
}

export async function verifyOtp(phone: string, code: string) {
  const payload = { phone, code }
  const res = await apiRequest("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  if (!res.token || res.token.trim() === "") {
    throw new Error("[AUTH FAILED]")
  }

  saveToken(res.token)

  currentUser = res.user || null
  return res
}

export function getUser() {
  return currentUser
}

export async function getMe() {
  if (currentUser) {
    return currentUser
  }

  try {
    currentUser = await apiRequest("/api/auth/me")
  } catch {
    clearToken()
    currentUser = null
  }

  return currentUser
}

export function hasToken() {
  return Boolean(getStoredToken())
}

export function logout() {
  clearToken()
  currentUser = null
}
