import type { CSSProperties } from "react";
import { tokens } from "./tokens";

const buttonBase: CSSProperties = {
  height: "48px",
  minHeight: "44px",
  padding: `0 ${tokens.spacing.lg}`,
  borderRadius: tokens.radii.md,
  fontFamily: tokens.typography.fontFamily,
  fontSize: tokens.typography.body.fontSize,
  fontWeight: 600,
  lineHeight: tokens.typography.body.lineHeight,
  outline: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: tokens.spacing.xs,
  transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
};

const inputBase: CSSProperties = {
  width: "100%",
  height: "48px",
  minHeight: "44px",
  padding: `0 ${tokens.spacing.md}`,
  borderRadius: tokens.radii.md,
  // BF_CLIENT_BLOCK_v_WIZARD_DIRECTION_A_v1 - stronger resting border so fields read as editable.
  // BF_CLIENT_DESIGN_v173 - on the brand hairline rather than body-text grey.
  // 1.5px is kept: it was a deliberate call so fields read as editable.
  border: `1.5px solid ${tokens.colors.border}`,
  background: tokens.colors.surface,
  color: tokens.colors.textPrimary,
  fontFamily: tokens.typography.fontFamily,
  fontSize: tokens.typography.body.fontSize,
  lineHeight: tokens.typography.body.lineHeight,
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

export const components = {
  buttons: {
    base: buttonBase,
    primary: {
      background: tokens.colors.primary,
      color: tokens.colors.surface,
      border: `1px solid ${tokens.colors.primary}`,
    },
    secondary: {
      background: tokens.colors.surface,
      color: tokens.colors.primary,
      border: `1px solid ${tokens.colors.border}`,
    },
    ghost: {
      background: "transparent",
      color: tokens.colors.primary,
      border: "1px solid transparent",
    },
    disabled: {
      background: tokens.colors.disabled,
      color: tokens.colors.surface,
      border: `1px solid ${tokens.colors.disabled}`,
      cursor: "not-allowed",
    },
    focus: {
      boxShadow: tokens.shadows.focus,
    },
    spinner: {
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      border: `2px solid rgba(255, 255, 255, 0.4)`,
      borderTopColor: tokens.colors.surface,
      animation: "spin 0.8s linear infinite",
    },
    spinnerDark: {
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      border: `2px solid rgba(11, 42, 74, 0.2)`,
      borderTopColor: tokens.colors.primary,
      animation: "spin 0.8s linear infinite",
    },
  },
  inputs: {
    base: inputBase,
    focused: {
      // BF_CLIENT_DESIGN_v173 - gold border with the gold ring, so a focused
      // field and a focused button look like the same system.
      borderColor: tokens.colors.accent,
      boxShadow: tokens.shadows.focus,
    },
    error: {
      borderColor: tokens.colors.error,
      boxShadow: tokens.shadows.errorFocus,
    },
    disabled: {
      background: tokens.colors.disabled,
      cursor: "not-allowed",
    },
  },
  checkbox: {
    base: {
      width: "18px",
      height: "18px",
      borderRadius: "4px",
      border: `1px solid ${tokens.colors.border}`,
      background: tokens.colors.surface,
      display: "inline-grid",
      placeContent: "center",
      appearance: "none",
    },
    checked: {
      // BF_CLIENT_DESIGN_v173 - gold ground with a navy tick, matching the
      // primary button rather than inverting it.
      background: tokens.colors.accent,
      border: `1px solid ${tokens.colors.accent}`,
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 10.5l3 3 7-7' stroke='%230B1F3A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundSize: "12px",
    },
  },
  card: {
    base: {
      background: tokens.colors.surface,
      borderRadius: tokens.radii.lg,
      border: `1px solid ${tokens.colors.border}`,
      padding: tokens.spacing.lg,
    },
    muted: {
      background: tokens.colors.background,
      borderRadius: tokens.radii.lg,
      border: `1px solid ${tokens.colors.border}`,
      padding: tokens.spacing.md,
    },
  },
  form: {
    label: {
      display: "block",
      marginBottom: tokens.spacing.xs,
      fontSize: tokens.typography.label.fontSize,
      fontWeight: tokens.typography.label.fontWeight,
      color: tokens.colors.textSecondary,
    },
    helperText: {
      fontSize: tokens.typography.helper.fontSize,
      fontWeight: tokens.typography.helper.fontWeight,
      color: tokens.colors.textSecondary,
      marginTop: tokens.spacing.xs,
    },
    errorText: {
      fontSize: tokens.typography.error.fontSize,
      fontWeight: tokens.typography.error.fontWeight,
      color: tokens.colors.error,
      marginTop: tokens.spacing.xs,
    },
    eyebrow: {
      textTransform: "uppercase",
      // BF_CLIENT_DESIGN_v172 - the site's eyebrow is gold at .14em, not grey
      // at .2em. This is the "STEP 3 OF 6" line above each step title.
      letterSpacing: "0.14em",
      fontSize: "13px",
      fontWeight: 600,
      color: tokens.colors.accent,
    },
    title: {
      // BF_CLIENT_DESIGN_v172 - display serif, matching every heading on
      // boreal.financial. The step title is the first thing on each screen.
      fontFamily: tokens.typography.displayFamily,
      fontSize: tokens.typography.h1.fontSize,
      fontWeight: tokens.typography.h1.fontWeight,
      lineHeight: tokens.typography.h1.lineHeight,
      color: tokens.colors.textPrimary,
      margin: 0,
    },
    subtitle: {
      fontSize: tokens.typography.body.fontSize,
      fontWeight: tokens.typography.body.fontWeight,
      color: tokens.colors.textSecondary,
      margin: 0,
    },
    sectionTitle: {
      fontSize: tokens.typography.h2.fontSize,
      fontWeight: tokens.typography.h2.fontWeight,
      lineHeight: tokens.typography.h2.lineHeight,
      color: tokens.colors.textPrimary,
      margin: 0,
    },
    sectionHeader: {
      display: "flex",
      flexDirection: "column" as const,
      gap: tokens.spacing.xs,
    },
    fieldStack: {
      display: "flex",
      flexDirection: "column" as const,
      gap: tokens.spacing.xs,
    },
  },
  timeline: {
    container: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: tokens.spacing.sm,
    },
    pill: {
      borderRadius: tokens.radii.pill,
      padding: "6px 14px",
      fontSize: "12px",
      fontWeight: 600,
      textAlign: "center" as const,
    },
  },
  emptyState: {
    container: {
      textAlign: "center" as const,
      padding: tokens.spacing.lg,
      color: tokens.colors.textSecondary,
      fontSize: tokens.typography.body.fontSize,
    },
  },
  uploadCard: {
    container: {
      border: `1px dashed ${tokens.colors.border}`,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.md,
      background: tokens.colors.background,
      display: "flex",
      flexDirection: "column" as const,
      gap: tokens.spacing.xs,
    },
    title: {
      fontWeight: 600,
      color: tokens.colors.textPrimary,
    },
    meta: {
      fontSize: tokens.typography.helper.fontSize,
      color: tokens.colors.textSecondary,
    },
  },
  chat: {
    launcher: {
      borderRadius: tokens.radii.pill,
      padding: "12px 20px",
      border: "none",
      background: tokens.colors.primary,
      color: tokens.colors.surface,
      fontWeight: 600,
      boxShadow: tokens.shadows.card,
    },
    panel: {
      background: tokens.colors.surface,
      border: `1px solid ${tokens.colors.border}`,
      borderRadius: tokens.radii.lg,
      padding: tokens.spacing.md,
      width: "320px",
      maxWidth: "100%",
      height: "520px",
      display: "flex",
      flexDirection: "column" as const,
      gap: tokens.spacing.sm,
      boxShadow: tokens.shadows.card,
    },
    tag: {
      padding: "4px 12px",
      borderRadius: tokens.radii.pill,
      border: `1px solid ${tokens.colors.border}`,
      fontSize: tokens.typography.helper.fontSize,
      fontWeight: 600,
      background: tokens.colors.surface,
      color: tokens.colors.textSecondary,
    },
    tagActive: {
      background: tokens.colors.primaryLight,
      color: tokens.colors.primary,
      borderColor: tokens.colors.primaryLight,
    },
    bubble: {
      padding: tokens.spacing.sm,
      borderRadius: tokens.radii.md,
      background: tokens.colors.background,
      fontSize: "14px",
      color: tokens.colors.textPrimary,
    },
    bubbleMeta: {
      fontSize: "12px",
      color: tokens.colors.textSecondary,
      marginBottom: tokens.spacing.xs,
    },
  },
};
