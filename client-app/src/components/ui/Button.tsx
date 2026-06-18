import * as React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

// #20 / #27 — the variant prop was previously ignored, so primary CTAs rendered
// as bare browser buttons (weak/outline) and disabled buttons had no affordance.
// Real styles are applied here; any caller-supplied `style` still wins (spread
// last), so buttons with custom inline styling are unaffected.
const BASE_STYLE: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 16,
  lineHeight: 1.2,
  borderRadius: 10,
  padding: "12px 20px",
  minHeight: 48,
  cursor: "pointer",
  transition: "opacity 120ms ease",
};

const VARIANT_STYLES: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
  primary: { background: "#2563eb", color: "#ffffff", border: "none" },
  secondary: { background: "#ffffff", color: "#2563eb", border: "1px solid #2563eb" },
  ghost: { background: "transparent", color: "#2563eb", border: "none" },
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
