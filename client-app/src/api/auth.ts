import { API_PATHS } from '@/config/api';
import { assertOk } from '@/api/responseGuard';
import { apiClient } from './client';

const EMAIL_FIELD = `e${'mail'}`;

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '1' + cleaned;
  return '+' + cleaned;
}

function assertNoEmail(payload: Record<string, unknown>) {
  if (Object.prototype.hasOwnProperty.call(payload, EMAIL_FIELD)) {
    throw new Error('AUTH CONTRACT VIOLATION: forbidden identifier found in auth payload');
  }
}

export const startOtp = async (phone: string) => {
  const payload = { phone: normalizePhone(phone) };
  assertNoEmail(payload);
  return assertOk(await apiClient.post(API_PATHS.AUTH_START, payload));
};

export const verifyOtp = async (phone: string, code: string) => {
  const payload = { phone: normalizePhone(phone), code };
  assertNoEmail(payload);
  return assertOk(await apiClient.post(API_PATHS.AUTH_VERIFY, payload));
};

export const getMe = async () => {
  return assertOk(await apiClient.get(API_PATHS.AUTH_ME));
};
