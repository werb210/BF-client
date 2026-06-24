import { components, tokens } from "@/styles";

// BF_CLIENT_BLOCK_v_WIZARD_DIRECTION_A_v1 — short labels that fit the 6-dot stepper.
const STEP_LABELS = ["Profile", "Product", "Business", "Owners", "Docs", "Review"];

type StepHeaderProps = {
  step: number;
  title: string;
  totalSteps?: number;
};

export function StepHeader({ step, title, totalSteps = 6 }: StepHeaderProps) {
  return (
    <div style={{ marginBottom: tokens.spacing.lg }}>
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: tokens.spacing.md }}>
        {STEP_LABELS.slice(0, totalSteps).map((label, i) => {
          const n = i + 1;
          const done = n < step;
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
              }}>{done ? "\u2713" : n}</div>
              <div style={{ fontSize: 10, fontWeight: 600, textAlign: "center", color: on ? tokens.colors.textPrimary : tokens.colors.textSecondary }}>{label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ ...components.form.eyebrow, marginBottom: tokens.spacing.xs }}>Step {step} of {totalSteps}</div>
      <h1 style={components.form.title}>{title}</h1>
    </div>
  );
}
