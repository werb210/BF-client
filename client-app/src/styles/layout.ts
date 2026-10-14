import { tokens } from "./tokens";

export const layout = {
  page: {
    minHeight: "100vh",
    background: tokens.colors.background,
    color: tokens.colors.textPrimary,
    fontFamily: tokens.typography.fontFamily,
    padding: "var(--page-padding)",
  },
  centerColumn: {
    width: "100%",
    maxWidth: "var(--form-max-width)",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    gap: tokens.spacing.lg,
  },
  portalColumn: {
    width: "100%",
    maxWidth: "var(--portal-max-width)",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column" as const,
    gap: tokens.spacing.lg,
  },
  stack: {
    display: "flex",
    flexDirection: "column" as const,
    gap: tokens.spacing.md,
  },
  stackTight: {
    display: "flex",
    flexDirection: "column" as const,
    gap: tokens.spacing.sm,
  },
  row: {
    display: "flex",
    gap: tokens.spacing.sm,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
  },
  stickyCta: {
    position: "sticky" as const,
    bottom: "var(--page-padding, 0px)", // BF_CLIENT_v805_PHONE_FIXES - --page-padding is never defined, so this was not sticky
    padding: tokens.spacing.sm,
    borderRadius: tokens.radii.lg,
    background: tokens.colors.surface,
    boxShadow: tokens.shadows.card,
  },
};
