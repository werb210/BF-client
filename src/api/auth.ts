import { api } from '../lib/api';

export function sendOtp(phone: string) {
  return api('/api/auth/otp/start', {
    method: 'POST',
    body: { phone },
  });
}

export function verifyOtp(phone: string, code: string) {
  return api('/api/auth/otp/verify', {
    method: 'POST',
    body: { phone, code },
  });
}
