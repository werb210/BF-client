import { api } from '@/lib/api';

export function sendOtp(phone: string) {
  return api.post('/auth/send-otp', { phone });
}

export function verifyOtp(phone: string, code: string) {
  return api.post('/auth/verify-otp', { phone, code });
}
