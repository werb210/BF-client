import * as React from "react";
import { components } from "@/styles"; // BF_CLIENT_BLOCK_v_BUTTON_HIERARCHY_v1

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

// #20 / #27 — the variant prop was previously ignored, so primary CTAs rendered
// as bare browser buttons (weak/outline) and disabled buttons had no affordance.
// Real styles are applied here; any caller-supplied `style` still wins (spread
// last), so buttons with custom inline styling are unaffected.
// BF_CLIENT_BLOCK_v_BUTTON_HIERARCHY_v1 — consume the canonical tokenized button
// hierarchy (brand blue primary via components.buttons) instead of the old
// hardcoded #2563eb, so every wizard button matches the Direction A inputs/stepper.
const BASE_STYLE: React.CSSProperties = {
  ...components.buttons.base,
  cursor: "pointer",
  transition: "opacity 120ms ease",
};

const VARIANT_STYLES: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
  primary: components.buttons.primary,
  secondary: components.buttons.secondary,
  ghost: components.buttons.ghost,
};

export const Button = ({
  children,
  loading,
  variant = "primary",
  style,
  disabled,
  ...props
}: ButtonProps) => {
  const isDisabled = Boolean(disabled || loading);
  return (
    <button
      {...props}
      disabled={isDisabled}
      style={{
        ...BASE_STYLE,
        ...VARIANT_STYLES[variant],
        ...(isDisabled ? { opacity: 0.5, cursor: "not-allowed" } : null),
        ...style,
      }}
    >
      {loading ? "Loading..." : children}
    </button>
  );
};

export const PrimaryButton = (props: ButtonProps) => <Button variant="primary" {...props} />;
export const SecondaryButton = (props: ButtonProps) => <Button variant="secondary" {...props} />;
