import { api } from '@/lib/api';

export function sendOtp(phone: string) {
  return api('/auth/send-otp', {
    method: 'POST',
    body: { phone },
  });
}

export function verifyOtp(phone: string, code: string) {
  return api('/auth/verify-otp', {
    method: 'POST',
    body: { phone, code },
  });
}
