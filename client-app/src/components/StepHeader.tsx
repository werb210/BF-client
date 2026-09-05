import { FieldTips } from "./FieldTips"; // BF_CLIENT_FIELD_TIPS_v1
import { components, tokens } from "@/styles";
// BF_CLIENT_QA_FLOW_FIXES_v1
import { useApplicationStore } from "@/state/useApplicationStore";
import { isStartupPathKyc } from "@/wizard/wizardSchema";

// BF_CLIENT_BLOCK_v_WIZARD_DIRECTION_A_DESIGN_v1 — Direction A "Refined Cards":
// dark header band with a blue progress fill, labeled 6-dot stepper, blue
// "STEP X OF 6" eyebrow, title, and an optional descriptive subtitle.
const STEP_LABELS = ["Profile", "Product", "Business", "Owners", "Docs", "Review"];

type StepHeaderProps = {
  step: number;
  title: string;
  subtitle?: string;
  totalSteps?: number;
};

export function StepHeader({ step, title, subtitle, totalSteps = 6 }: StepHeaderProps) {
  // BF_CLIENT_FIELD_TIPS_v1 - every wizard step renders StepHeader, so
  // mounting the tips decorator here covers all steps with one edit.
  // BF_CLIENT_QA_FLOW_FIXES_v1 - on the SBA / Start-up path the wizard skips
  // Product (2) and Docs (5); show them as skipped, not completed.
  const { app } = useApplicationStore();
  const skipped = new Set<number>(isStartupPathKyc(app.kyc as Record<string, unknown>) ? [2, 5] : []);
  const pct = Math.max(0, Math.min(1, (step - 1) / (totalSteps - 1))) * 100;
  return (
    <>
      <FieldTips />
      <div>
        <div
          style={{
            margin: "-24px -24px 20px",
            background: "#0b1220",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: "14px 24px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span aria-hidden style={{ color: "#fff", fontSize: 16, lineHeight: 1 }}>&#9650;</span>
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: 0.2 }}>Boreal</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: tokens.colors.primary, transition: "width .3s ease" }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: tokens.spacing.lg }}>
          {STEP_LABELS.slice(0, totalSteps).map((label, i) => {
            const n = i + 1;
            const isSkipped = skipped.has(n);
            const done = !isSkipped && n < step;
            const cur = n === step;
            const on = done || cur;
            return (
              <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" }}>
                {i < totalSteps - 1 && (
                  <div style={{ position: "absolute", top: 13, left: "50%", width: "100%", height: 2, background: done ? tokens.colors.primary : tokens.colors.border, zIndex: 1 }} />
                )}
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, zIndex: 2, boxSizing: "border-box",
                  background: on ? tokens.colors.primary : tokens.colors.surface,
                  color: on ? tokens.colors.surface : tokens.colors.textSecondary,
                  border: `2px solid ${on ? tokens.colors.primary : tokens.colors.border}`,
                  boxShadow: cur ? tokens.shadows.focus : "none",
                }}>{isSkipped ? "\u2013" : done ? "\u2713" : n}</div>
                <div style={{ fontSize: 10, fontWeight: 600, textAlign: "center", color: on ? tokens.colors.textPrimary : tokens.colors.textSecondary }}>{label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...components.form.eyebrow, marginBottom: tokens.spacing.xs }}>Step {step} of {totalSteps}</div>
        <h1 style={{ ...components.form.title, marginBottom: subtitle ? 6 : 0 }}>{title}</h1>
        {subtitle && (
          <p style={{ margin: 0, marginBottom: tokens.spacing.md, color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 1.5 }}>{subtitle}</p>
        )}
      </div>
    </>
  );
}
