import { useSessionRefreshing } from "../hooks/useSessionRefreshing";
import { Button } from "./ui/Button";
import { components, layout, tokens } from "@/styles";

export function SessionRefreshOverlay() {
  const isRefreshing = useSessionRefreshing();
  if (!isRefreshing) return null;

  return (
    <div style={{ ...layout.page, textAlign: "center", position: "fixed", inset: 0, zIndex: 9999, background: "#fff" }}>
      <div style={{ maxWidth: "420px", margin: "0 auto", paddingTop: "30vh" }}>
        <div style={{ fontSize: tokens.typography.h2.fontSize, fontWeight: 600, color: tokens.colors.primary }}>
          We're refreshing your session
        </div>
        <p style={{ ...components.form.subtitle, marginTop: tokens.spacing.xs }}>
          Please wait while we refresh your session.
        </p>
        <div style={{ marginTop: tokens.spacing.md, display: "flex", justifyContent: "center" }}>
          <Button onClick={() => window.location.reload()} type="button">Reload</Button>
        </div>
      </div>
    </div>
  );
}
