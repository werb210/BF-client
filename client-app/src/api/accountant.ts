// BF_CLIENT_ACCOUNTANT_PORTAL_v1 - accountant-scoped API access.
import { ENV } from "@/env";

const API_BASE = ENV.API_BASE || "https://server.boreal.financial";
const TOKEN_KEY = "boreal_accountant_token";

export type AccountantApplication = { id: string; business_name: string | null; created_at?: string };
export type AccountantUploadSlot = { category: string; outstanding: boolean };

export function getAccountantToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setAccountantToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* The session will not survive a reload. */ }
}

export function clearAccountantToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* Nothing to clear. */ }
}

function unwrap<T>(payload: unknown): T {
  const envelope = payload as { data?: unknown } | null;
  return (envelope?.data ?? payload) as T;
}

async function accountantFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccountantToken();
  const headers = new Headers(init.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const body = parsed as { error?: unknown };
    const err = new Error(String(body?.error ?? `request_failed_${res.status}`)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return unwrap<T>(parsed);
}

export async function startAccountantOtp(phone: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/otp/start`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new Error("otp_start_failed");
}

export async function verifyAccountantOtp(phone: string, code: string): Promise<{ name: string | null }> {
  const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code, userType: "accountant" }),
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const body = parsed as { error?: unknown };
    const err = new Error(String(body?.error ?? "verify_failed")) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = unwrap<{ token?: string; user?: { name?: string | null } }>(parsed);
  if (!data?.token) throw new Error("verify_failed");
  setAccountantToken(data.token);
  return { name: data.user?.name ?? null };
}

export function fetchAccountantMe() {
  return accountantFetch<{
    accountant: { id: string; name: string | null; email: string | null; phone: string | null };
    applications: AccountantApplication[];
  }>("/api/accountant/me");
}

export function fetchAccountantApplication(id: string) {
  return accountantFetch<{
    application: { id: string; business_name: string | null };
    uploads: AccountantUploadSlot[];
    forms: string[];
  }>(`/api/accountant/applications/${encodeURIComponent(id)}`);
}

export async function uploadAccountantDocument(id: string, category: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  body.append("category", category);
  return accountantFetch<{ id: string }>(`/api/accountant/applications/${encodeURIComponent(id)}/upload`, {
    method: "POST", body,
  });
}
