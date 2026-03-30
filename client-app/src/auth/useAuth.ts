import { useEffect, useState } from "react";
import { getMe } from "@/lib/auth";

type AuthUser = Record<string, unknown> | null;

let meRequest: Promise<AuthUser> | null = null;

function loadMeOnce() {
  if (!meRequest) {
    meRequest = getMe() as Promise<AuthUser>;
  }
  return meRequest;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void loadMeOnce().then((me) => {
      if (!active) return;
      setUser(me);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}
