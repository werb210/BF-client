import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiCall } from "../api/client";
import {
  clearActiveClientSessionToken,
  ensureClientSession,
  getClientSessionByToken,
  setActiveClientSessionToken,
  getClientSessionState,
  type ClientSession,
  type ClientSessionState,
} from "@/state/clientSession";

type UseClientSessionResult = {
  session: ClientSession | null;
  state: ClientSessionState | "missing";
  isTerminal: boolean;
};

function getTokenFromSearch(search: string) {
  return new URLSearchParams(search).get("token");
}

export function useClientSession(tokenOverride?: string | null): UseClientSessionResult {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(
    () => tokenOverride ?? getTokenFromSearch(location.search),
    [location.search, tokenOverride]
  );
  const [session, setSession] = useState<ClientSession | null>(null);
  const [state, setState] = useState<ClientSessionState | "missing">("missing");

  useEffect(() => {
    if (!token) {
      clearActiveClientSessionToken();
      setSession(null);
      setState("missing");
      return;
    }

    let active = true;

    const validateAndPersist = async () => {
      try {
        const res = await apiCall("/api/session", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (!active) return;
        if (!(res as { valid?: boolean })?.valid) {
          clearActiveClientSessionToken();
          setSession(null);
          setState("missing");
          navigate("/", { replace: true });
          return;
        }

        setActiveClientSessionToken(token);

        const next =
          getClientSessionByToken(token) ||
          ensureClientSession({ submissionId: token, accessToken: token });
        setSession(next);
        setState(getClientSessionState(next));
      } catch {
        if (!active) return;
        clearActiveClientSessionToken();
        setSession(null);
        setState("missing");
        navigate("/", { replace: true });
      }
    };

    void validateAndPersist();

    return () => {
      active = false;
    };
  }, [token, navigate]);

  useEffect(() => {
    if (state === "expired") {
      navigate("/expired", { replace: true });
    } else if (state === "revoked") {
      navigate("/revoked", { replace: true });
    }
  }, [navigate, state]);

  return {
    session,
    state,
    isTerminal: state === "expired" || state === "revoked",
  };
}
