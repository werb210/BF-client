import { useEffect, useState } from "react";
import { getMe } from "@/api/auth";
import { retry } from "@/utils/retry";

type AuthUser = Record<string, unknown> | null;

let meRequest: Promise<AuthUser> | null = null;

function loadMeOnce() {
  if (!meRequest) {
    meRequest = retry(() => getMe() as Promise<AuthUser>).catch((error) => {
      meRequest = null;
      throw error;
    });
  }
  return meRequest;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void loadMeOnce()
      .then((me) => {
        if (!active) return;
        setUser(me);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}
