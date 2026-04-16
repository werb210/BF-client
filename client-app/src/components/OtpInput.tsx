import { useEffect, useMemo, useRef, useState } from "react";
import { components, tokens, behaviors } from "@/styles";

type OtpInputProps = {
  length?: number;
  onComplete: (code: string) => void;
  autoFocus?: boolean;
};

export function OtpInput({
  length = behaviors.otp.length,
  onComplete,
  autoFocus = behaviors.otp.autoFocus,
}: OtpInputProps) {
  const [values, setValues] = useState<string[]>(() =>
    Array.from({ length }, () => "")
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => values.join(""), [values]);

  useEffect(() => {
    if (code.length === length && !values.includes("")) {
      onComplete(code);
    }
  }, [code, length, onComplete, values]);

  useEffect(() => {
    if (autoFocus) {
      inputsRef.current[0]?.focus();
    }
  }, [autoFocus]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setValues((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Backspace" && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      return;
    }
    if (event.key === "Enter") {
      if (!values.includes("")) {
        onComplete(values.join(""));
      }
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text");
    const digits = text.replace(/\D/g, "").slice(0, length).split("");
    if (!digits.length) return;
    setValues((prev) => {
      const next = [...prev];
      digits.forEach((digit, index) => {
        next[index] = digit;
      });
      return next;
    });
    const nextIndex = Math.min(digits.length, length - 1);
    inputsRef.current[nextIndex]?.focus();
  }

  const inputStyle = {
    ...components.inputs.base,
    width: "48px",
    height: "48px",
    padding: 0,
    textAlign: "center" as const,
    fontSize: "18px",
    fontWeight: 600,
    color: tokens.colors.primary,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing.sm }}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="\d*"
          maxLength={1}
          value={values[index]}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          style={{
            ...inputStyle,
            ...(focusedIndex === index ? components.inputs.focused : null),
          }}
        />
      ))}
    </div>
  );
}
