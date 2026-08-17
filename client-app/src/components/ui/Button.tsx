import * as React from "react";
import "./button.css"; // BF_CLIENT_UI_v169

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
};

// #20 / #27 — the variant prop was previously ignored, so primary CTAs rendered
// as bare browser buttons (weak/outline) and disabled buttons had no affordance.
// Real styles are applied here; any caller-supplied `style` still wins (spread
// last), so buttons with custom inline styling are unaffected.
// BF_CLIENT_UI_v169 - sizing and colour now live in button.css so the
// interactive states work. Callers passing `style` still win: it spreads last.
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
      className={["bf-btn", `bf-btn--${variant}`, props.className].filter(Boolean).join(" ")}
      style={style}
    >
      {loading ? "Loading..." : children}
    </button>
  );
};

export const PrimaryButton = (props: ButtonProps) => <Button variant="primary" {...props} />;
export const SecondaryButton = (props: ButtonProps) => <Button variant="secondary" {...props} />;
