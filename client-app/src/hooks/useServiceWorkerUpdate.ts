import { useEffect, useState, useCallback } from "react";
import { applyClientSWUpdate } from "@/pwa/registerSW";

export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    const handler = () => setUpdateAvailable(true);
    window.addEventListener("bf:sw-update-available", handler);
    return () => window.removeEventListener("bf:sw-update-available", handler);
  }, []);
  const applyUpdate = useCallback(() => applyClientSWUpdate(), []);
  return { updateAvailable, applyUpdate };
}
