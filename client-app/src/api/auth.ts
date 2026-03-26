import api from '../lib/api';
import { normalizePhone } from '../lib/phone';

export async function sendOtp(phone: string) {
  return api.post('/auth/otp/start', { phone: normalizePhone(phone) });
}

export async function verifyOtp(phone: string, code: string) {
  const res = await api.post<{ token?: string }>('/auth/otp/verify', {
    phone: normalizePhone(phone),
    code,
  });

  if (!res.token) throw new Error('Missing token');

  localStorage.setItem('token', res.token);

  return res.token;
}

export async function verifyOtpCode(phone: string, otpCode: string) {
  return verifyOtp(phone, otpCode);
}
