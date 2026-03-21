import api from "@/api/client";
import { getContinuationSession } from "@/api/continuation";
import { API_CONTRACT } from "@/contracts";

export interface CreditReadinessPayload {
  companyName: string;
  fullName: string;
  phone: string;
  email: string;
  industry?: string;
  yearsInBusiness?: string;
  monthlyRevenue?: string;
  annualRevenue?: string;
  arOutstanding?: string;
  collateral?: string;
}

const CONTACT_DEDUP_KEY = "boreal_contact_submission_cache";
const READINESS_DEDUP_KEY = "boreal_readiness_submission_cache";
const READINESS_TOKEN_KEY = "boreal_readiness_token";
export const READINESS_SESSION_ID_KEY = "boreal_readiness_session_id";
const SESSION_ID_QUERY_PARAM = "sessionId";
const TOKEN_QUERY_PARAM = "token";
let readinessInFlight: Promise<any> | null = null;
let contactInFlight: Promise<any> | null = null;

const MAX_REQUEST_ATTEMPTS = 2;

function shouldRetryRequest(error: unknown, attempt: number) {
  if (attempt >= MAX_REQUEST_ATTEMPTS) {
    return false;
  }

  const maybeError = error as {
    code?: string;
    response?: {
      status?: number;
    };
  };

  const status = maybeError?.response?.status;
  if (typeof status === "number") {
    return status >= 500;
  }

  return maybeError?.code === "ECONNABORTED" || maybeError?.code === "ERR_NETWORK";
}

async function postWithRetry<TPayload>(
  path: string,
  payload: TPayload
) {
  let attempt = 0;
  while (true) {
    try {
      return await api.post(path, payload);
    } catch (error) {
      attempt += 1;
      if (!shouldRetryRequest(error, attempt)) {
        throw error;
      }
    }
  }
}

function normalize(value: string | undefined) {
  return (value || "").trim().toLowerCase();
}

function dedupKey(payload: { email?: string; phone?: string }) {
  return `${normalize(payload.email)}::${normalize(payload.phone)}`;
}

function loadCache(storageKey: string): Record<string, any> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, any>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCache(storageKey: string, cache: Record<string, any>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(cache));
  } catch {
    // ignore storage failures
  }
}

export async function submitCreditReadiness(payload: CreditReadinessPayload) {
  if (readinessInFlight) {
    return readinessInFlight;
  }

  readinessInFlight = (async () => {
    const key = dedupKey(payload);

    if (key !== "::") {
      const cache = loadCache(READINESS_DEDUP_KEY);
      if (cache[key]) {
        const cached = cache[key] as Record<string, any>;
        persistReadinessSession(cached);
        return cached;
      }
    }

    const existingSession = await findExistingReadinessSession(payload);
    if (existingSession) {
      persistReadinessSession(existingSession);
      if (key !== "::") {
        const cache = loadCache(READINESS_DEDUP_KEY);
        cache[key] = existingSession;
        saveCache(READINESS_DEDUP_KEY, cache);
      }
      return existingSession;
    }

    const res = await postWithRetry(
      API_CONTRACT.READINESS.ROOT,
      payload
    );
    const responseData = res.data;
    if (hasValidReadinessSessionId(responseData as Record<string, any>)) {
      persistReadinessSession(responseData as Record<string, any>);
    }
    if (key !== "::") {
      const cache = loadCache(READINESS_DEDUP_KEY);
      cache[key] = responseData;
      saveCache(READINESS_DEDUP_KEY, cache);
    }
    return responseData;
  })();

  try {
    return await readinessInFlight;
  } finally {
    readinessInFlight = null;
  }
}

export async function submitContactForm(payload: {
  companyName: string;
  fullName: string;
  phone: string;
  email: string;
  message?: string;
}) {
  if (contactInFlight) {
    return contactInFlight;
  }

  const key = dedupKey(payload);
  if (key !== "::") {
    const cache = loadCache(CONTACT_DEDUP_KEY);
    if (cache[key]) {
      return cache[key];
    }
  }

  contactInFlight = (async () => {
    try {
      const res = await postWithRetry(
        API_CONTRACT.CRM.WEB_LEADS,
        payload
      );
      const responseData = res.data;
      if (hasValidReadinessSessionId(responseData as Record<string, any>)) {
        persistReadinessSession(responseData as Record<string, any>);
      }
      if (key !== "::") {
        const cache = loadCache(CONTACT_DEDUP_KEY);
        cache[key] = responseData;
        saveCache(CONTACT_DEDUP_KEY, cache);
      }
      return responseData;
    } catch {
      throw new Error("Unable to submit contact form. Please try again.");
    } finally {
      contactInFlight = null;
    }
  })();

  return contactInFlight;
}

export function getStoredReadinessToken() {
  try {
    return localStorage.getItem(READINESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredReadinessSessionId() {
  try {
    return localStorage.getItem(READINESS_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

export function clearStoredReadinessSession() {
  try {
    localStorage.removeItem(READINESS_SESSION_ID_KEY);
    localStorage.removeItem(READINESS_TOKEN_KEY);
  } catch {
    // ignore storage failures
  }
}

export function getReadinessSessionIdFromUrl(search: string) {
  const params = new URLSearchParams(search);
  const queryValue = params.get(SESSION_ID_QUERY_PARAM);
  if (!queryValue) return null;
  const normalized = queryValue.trim();
  return normalized || null;
}

export function getReadinessTokenFromUrl(search: string) {
  const params = new URLSearchParams(search);
  const queryValue = params.get(TOKEN_QUERY_PARAM) || params.get("continue");
  if (!queryValue) return null;
  const normalized = queryValue.trim();
  return normalized || null;
}

export function resolveReadinessSessionId(search?: string) {
  const querySessionId =
    typeof search === "string" ? getReadinessSessionIdFromUrl(search) : null;
  if (querySessionId) {
    try {
      localStorage.setItem(READINESS_SESSION_ID_KEY, querySessionId);
    } catch {
      // ignore storage failures
    }
    return querySessionId;
  }

  return getStoredReadinessSessionId();
}

function hasValidReadinessSessionId(payload: Record<string, any> | null | undefined) {
  const readinessSessionId =
    (typeof payload?.readinessSessionId === "string" && payload.readinessSessionId.trim()) ||
    (typeof payload?.sessionId === "string" && payload.sessionId.trim()) ||
    "";
  return Boolean(readinessSessionId);
}

function persistReadinessSession(payload: Record<string, any> | null | undefined) {
  const sessionId =
    (typeof payload?.readinessSessionId === "string" && payload.readinessSessionId) ||
    (typeof payload?.sessionId === "string" && payload.sessionId) ||
    null;
  const readinessToken =
    (typeof payload?.readinessToken === "string" && payload.readinessToken) ||
    (typeof payload?.token === "string" && payload.token) ||
    null;

  try {
    if (sessionId) {
      localStorage.setItem(READINESS_SESSION_ID_KEY, sessionId);
    }
    if (readinessToken) {
      localStorage.setItem(READINESS_TOKEN_KEY, readinessToken);
    }
  } catch {
    // ignore storage failures
  }
}

async function findExistingReadinessSession(payload: CreditReadinessPayload) {
  try {
    const session = await getContinuationSession();
    if (!session || typeof session !== "object") return null;

    const sessionRecord = session as Record<string, any>;
    const sessionEmail = normalize(
      typeof sessionRecord.email === "string" ? sessionRecord.email : undefined
    );
    const sessionPhone = normalize(
      typeof sessionRecord.phone === "string" ? sessionRecord.phone : undefined
    );
    const payloadEmail = normalize(payload.email);
    const payloadPhone = normalize(payload.phone);
    if (!sessionEmail && !sessionPhone) return null;
    const matchesEmail = payloadEmail && payloadEmail === sessionEmail;
    const matchesPhone = payloadPhone && payloadPhone === sessionPhone;
    if (!matchesEmail && !matchesPhone) return null;
    return sessionRecord;
  } catch {
    return null;
  }
}
