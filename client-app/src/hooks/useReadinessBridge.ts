import { useEffect } from "react";
import { apiRequest } from "@/api/client";


type ReadinessData = Partial<{
  step1: unknown;
  step3: unknown;
  step4: unknown;
}>;

type ReadinessSetter = (value: unknown) => void;

export function useReadinessBridge(
  setStep1: ReadinessSetter,
  setStep3: ReadinessSetter,
  setStep4: ReadinessSetter,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("readiness");

    if (!token) return;

    async function fetchBridge(): Promise<void> {
      const data = await (apiRequest(`/api/readiness/continue?token=${encodeURIComponent(token)}`) as Promise<ReadinessData>).catch((): null => null);
      if (!data) return;

      setStep1(data.step1);
      setStep3(data.step3);
      setStep4(data.step4);

      localStorage.setItem("creditSessionToken", token);
    }

    void fetchBridge();
  }, [enabled, setStep1, setStep3, setStep4]);
}
