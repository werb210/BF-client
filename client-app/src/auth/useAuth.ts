import { useEffect, useState } from 'react';
import { hasToken } from '@/lib/auth';

type AuthUser = Record<string, unknown> | null;

export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(hasToken() ? {} : null);
    setLoading(false);
  }, []);

  return { user, loading };
}
