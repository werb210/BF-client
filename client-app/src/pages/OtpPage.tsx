import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { OtpInput } from "@/components/OtpInput";
import { resolveOtpNextStep } from "@/auth/otp";
import { startOtp, verifyOtp } from "@/api/auth";
import { tokens, components } from "@/styles";

type Step = "phone" | "code";

function toE164(raw: string): string {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // Already has country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // Standard 10-digit North American number
  if (digits.length === 10) return `+1${digits}`;
  // Partial entry — return as-is so user can keep typing
  return raw;
}

export default function OtpPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const readinessToken = searchParams.get("readiness_token");
    if (!readinessToken) return;
    sessionStorage.setItem("readiness_token", readinessToken);
  }, [searchParams]);

  async function handleSendCode() {
    const formatted = toE164(phone.trim()) || phone.trim();
    if (!formatted) return;
    setPhone(formatted);
    setLoading(true);
    setError(null);
    try {
      await startOtp(formatted);
      setStep("code");
    } catch {
      setError("Failed to send code. Please check your number and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(otpCode: string) {
    const formatted = toE164(phone.trim()) || phone.trim();
    setLoading(true);
    setError(null);
    try {
      const profile = await verifyOtp(formatted, otpCode);
      const next = resolveOtpNextStep((profile as any)?.profile ?? null);

      if (next.action === "portal") {
        navigate("/portal", { replace: true });
      } else {
        navigate("/apply/step-1", { replace: true });
      }
    } catch {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: tokens.colors.background }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 12, padding: tokens.spacing.xl, boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: tokens.spacing.xl }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: tokens.colors.textPrimary }}>Boreal Financial</h1>
          <p style={{ color: tokens.colors.textSecondary, marginTop: tokens.spacing.sm }}>
            {step === "phone" ? "Enter your mobile number to get started" : "Enter the 6-digit code sent to your phone"}
          </p>
        </div>

        {step === "phone" ? (
          <div style={components.form.fieldStack}>
            <label style={components.form.label}>Mobile Phone Number (E.164)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={(e) => {
                const formatted = toE164(e.target.value);
                if (formatted) setPhone(formatted);
              }}
              onKeyDown={(e) => e.key === "Enter" && void handleSendCode()}
              placeholder="+15550000000"
              style={components.inputs.base}
              autoFocus
            />
            {error && <p style={components.form.errorText}>{error}</p>}
            <button
              onClick={() => void handleSendCode()}
              disabled={loading || !phone.trim()}
              style={{ ...components.buttons.base, ...components.buttons.primary, width: "100%" }}
            >
              {loading ? "Sending..." : "Send Code"}
            </button>
          </div>
        ) : (
          <div style={components.form.fieldStack}>
            <label style={components.form.label}>Verification Code</label>
            <OtpInput length={6} onComplete={(value) => { setCode(value); void handleVerify(value); }} autoFocus />
            {error && <p style={components.form.errorText}>{error}</p>}
            <button
              onClick={() => void handleVerify(code)}
              disabled={loading || code.length !== 6}
              style={{ ...components.buttons.base, ...components.buttons.primary, width: "100%" }}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
            <button
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              style={{ ...components.buttons.base, ...components.buttons.ghost, width: "100%" }}
            >
              ← Change number
            </button>
            <button onClick={() => void handleSendCode()} style={{ ...components.buttons.base, ...components.buttons.ghost, width: "100%" }}>
              Resend code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
