import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";

export default function UpdatePromptBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  if (!updateAvailable) return null;
  return (
    <div role="alert" style={{
      // BF_CLIENT_BLOCK_v828_UPDATE_BANNER_ABOVE_HEADER — was hidden behind the fixed dark
      // header on iPad/iPhone (header z-index > 50). Lift above everything and clear the notch.
      position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 8px)", left: 16, right: 16, zIndex: 2147483000,
      background: "#F5C443", color: "#020C1C", padding: "10px 14px",
      borderRadius: 10, display: "flex", gap: 12, alignItems: "center",
      maxWidth: 480, margin: "0 auto", fontWeight: 600
    }}>
      <span style={{ flex: 1 }}>A new version is available.</span>
      <button onClick={applyUpdate} style={{ background: "#020C1C", color: "#F5C443", border: 0, padding: "6px 12px", borderRadius: 8 }}>Refresh</button>
    </div>
  );
}
