import type { ReactNode } from "react";
import { layout, components } from "@/styles";
import { OfflineBanner } from "./OfflineBanner";

type WizardLayoutProps = {
  children: ReactNode;
};

export function WizardLayout({ children }: WizardLayoutProps) {
  return (
    <div style={{ ...layout.page, display: "flex", justifyContent: "center" }}>
      <div style={layout.centerColumn}>
        <OfflineBanner />
        <div
          style={{
            ...components.card.base,
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            // BF_CLIENT_BLOCK_v_WIZARD_DIRECTION_A_DESIGN_v1 — elevation + overflow clip.
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15,23,42,0.06)",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default WizardLayout;
