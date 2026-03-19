import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export const startOtp = async (phone: string) => {
  return API.post('/api/auth/otp/start', {
    phone: normalizePhone(phone),
  });
};

export const verifyOtp = async (phone: string, code: string) => {
  return API.post('/api/auth/otp/verify', {
    phone: normalizePhone(phone),
    code,
  });
};

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  // Force Canadian format if missing country code
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }

  return '+' + cleaned;
}
