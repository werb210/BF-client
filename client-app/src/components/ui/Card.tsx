import type { CSSProperties, ReactNode, HTMLAttributes } from "react";
import { components } from "@/styles";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  variant?: "default" | "muted";
};

export function Card({
  children,
  style,
  className = "",
  variant = "default",
  ...rest
}: CardProps) {
  const baseStyle =
    variant === "muted" ? components.card.muted : components.card.base;

  return (
    // BF_CLIENT_v805_PHONE_FIXES - ui-card classes let the phone wizard drop the box inside the page box.
    <div className={["ui-card", "ui-card--" + variant, className].filter(Boolean).join(" ")} style={{ ...baseStyle, ...style }} {...rest}>
      {children}
    </div>
  );
}
