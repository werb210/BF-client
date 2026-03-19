import axios from 'axios';
import { API_PATHS } from '@/config/api';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '1' + cleaned;
  return '+' + cleaned;
}

function assertNoEmail(payload: Record<string, unknown>) {
  if ('email' in payload) {
    throw new Error('AUTH CONTRACT VIOLATION: email is not allowed in auth payload');
  }
}

export const startOtp = async (phone: string) => {
  const payload = { phone: normalizePhone(phone) };
  assertNoEmail(payload);
  return API.post(API_PATHS.AUTH_START, payload);
};

export const verifyOtp = async (phone: string, code: string) => {
  const payload = { phone: normalizePhone(phone), code };
  assertNoEmail(payload);
  return API.post(API_PATHS.AUTH_VERIFY, payload);
};

export const getMe = async () => {
  return API.get(API_PATHS.AUTH_ME);
};
