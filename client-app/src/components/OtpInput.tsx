import { useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";
import { components, tokens, behaviors } from "@/styles";

type OtpInputProps = {
  length?: number;
  onComplete: (code: string) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
};

export function OtpInput({
  length = behaviors.otp.length,
  onComplete,
  autoFocus = behaviors.otp.autoFocus,
  autoComplete = "one-time-code",
  inputMode = "numeric",
  pattern = "\\d*",
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
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, length).split("");
      setValues((prev) => {
        const next = [...prev];
        digits.forEach((d, i) => { if (i < length) next[i] = d; });
        return next;
      });
      requestAnimationFrame(() => {
        inputsRef.current[Math.min(digits.length, length) - 1]?.focus();
      });
      return;
    }
    const digit = cleaned.slice(-1);
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
          inputMode={inputMode}
          autoComplete={index === 0 ? autoComplete : "off"}
          pattern={pattern}
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
