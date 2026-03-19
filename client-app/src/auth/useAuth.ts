import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';

type AuthUser = Record<string, unknown> | null;

export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void apiClient
      .get(API_ENDPOINTS.AUTH_ME)
      .then((res) => {
        if (!mounted) return;
        const payload = (res.data ?? {}) as { data?: { user?: Record<string, unknown> }; user?: Record<string, unknown> };
        setUser(payload.data?.user ?? payload.user ?? null);
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading };
}
