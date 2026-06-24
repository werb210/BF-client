import {
  useState,
  type CSSProperties,
  type SelectHTMLAttributes,
} from "react";
import { components } from "@/styles";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  style?: CSSProperties;
  hasError?: boolean;
};

export function Select({
  style,
  className = "",
  disabled,
  hasError,
  ...props
}: SelectProps) {
  const [focused, setFocused] = useState(false);

  const baseStyle: CSSProperties = {
    ...components.inputs.base,
    ...(focused ? components.inputs.focused : null),
    ...(hasError ? components.inputs.error : null),
    ...(disabled ? components.inputs.disabled : null),
  };

  // BF_CLIENT_BLOCK_v_WIZARD_DIRECTION_A_v1 — chevron affordance so selects read as pickers.
  const chevron =
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='%234B5563' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")";
  return (
    <select
      {...props}
      disabled={disabled}
      aria-invalid={hasError || undefined}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      className={className}
      style={{
        ...baseStyle,
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        backgroundImage: chevron,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 14px center",
        paddingRight: "38px",
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    />
  );
}
