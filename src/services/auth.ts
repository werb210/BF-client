export { sendOtp, verifyOtp } from "@/api/auth";

export function getToken() {
  return localStorage.getItem("bf_session_token");
}

export function setToken(token: string) {
  localStorage.setItem("bf_session_token", token);
}

export function clearToken() {
  localStorage.removeItem("bf_session_token");
}
