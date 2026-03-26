import api from '../lib/api';

export async function getVoiceToken() {
  const res = await api.get<{ token?: string }>('/telephony/token');

  if (!res.token) throw new Error('Missing telephony token');

  return res.token;
}
