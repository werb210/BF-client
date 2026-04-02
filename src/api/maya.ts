import { api } from '@/lib/api';

export async function chatMaya(message: string) {
  return api.post<{ reply?: string }>('/maya/chat', { message });
}
