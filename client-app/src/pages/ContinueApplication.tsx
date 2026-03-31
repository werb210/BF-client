import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/api/client";
import { useApplicationStore } from "@/state/useApplicationStore";

type ContinueState = "loading" | "failed";

export default function ContinueApplication() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { loadFromServer } = useApplicationStore();
  const [state, setState] = useState<ContinueState>("loading");

  useEffect(() => {
    if (!token) {
      setState("failed");
      return;
    }

    let active = true;

    async function load() {
      try {
        const res = await api.get(`/api/applications/${token}`);
        if (!active) return;
        const { data } = res;
        loadFromServer(data);
        navigate("/apply", { replace: true });
      } catch {
        if (!active) return;
        setState("failed");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [token, loadFromServer, navigate]);

  if (state === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-base text-slate-700">
        We couldn&apos;t continue this application. You can start a new application below.
      </p>
      <button
        type="button"
        className="rounded bg-brand-bgAlt px-4 py-2 text-white"
        onClick={() => navigate("/apply", { replace: true })}
      >
        Start New Application
      </button>
    </div>
  );
}
