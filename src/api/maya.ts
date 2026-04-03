import { api } from '../lib/api';

export async function chatMaya(message: string) {
  return api<{ reply?: string }>('/maya/chat', {
    method: 'POST',
    body: { message },
  });
}
