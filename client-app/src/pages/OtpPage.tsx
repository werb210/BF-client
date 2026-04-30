import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { OtpInput } from "@/components/OtpInput";
import { resolveOtpNextStep } from "@/auth/otp";
import { startOtp, verifyOtp } from "@/api/auth";
// BF_CLIENT_v67_OTP_BOOT_FROM_SERVER — sync server-side submission state
// (from the v68 OTP verify enrichment) into the local profile before the
// boot router reads it, so users with empty localStorage still land on
// /portal when the server confirms they have a submitted application.
import { ClientProfileStore } from "@/state/clientProfiles";
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
  const [otpInputKey, setOtpInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sendInFlightRef = useRef(false);
  const lastSentAtRef = useRef<number>(0);
  const SEND_COOLDOWN_MS = 30_000;

  useEffect(() => {
    const readinessToken = searchParams.get("readiness_token");
    if (!readinessToken) return;
    sessionStorage.setItem("readiness_token", readinessToken);
  }, [searchParams]);

  async function handleSendCode() {
    const formatted = toE164(phone.trim()) || phone.trim();
    if (!formatted) return;
    if (sendInFlightRef.current) {
      console.log("[otp] handleSendCode skipped: in-flight");
      return;
    }
    const now = Date.now();
    if (now - lastSentAtRef.current < SEND_COOLDOWN_MS) {
      console.log("[otp] handleSendCode skipped: cooldown", { remainingMs: SEND_COOLDOWN_MS - (now - lastSentAtRef.current) });
      // Still advance the UI to the code step; the user already has a valid SMS in flight.
      setPhone(formatted);
      setStep("code");
      return;
    }
    sendInFlightRef.current = true;
    setPhone(formatted);
    setLoading(true);
    setError(null);
    try {
      await startOtp(formatted);
      lastSentAtRef.current = Date.now();
      setStep("code");
    } catch {
      setError("Failed to send code. Please check your number and try again.");
    } finally {
      sendInFlightRef.current = false;
      setLoading(false);
    }
  }

  async function handleVerify(otpCode: string) {
    const formatted = toE164(phone.trim()) || phone.trim();
    setLoading(true);
    setError(null);
    try {
      const profile = await verifyOtp(formatted, otpCode);

      // BF_CLIENT_v67_OTP_BOOT_FROM_SERVER — when the server says this
      // phone has a submitted application, write it into the local
      // profile so resolveOtpNextStep returns action="portal" even when
      // localStorage was previously empty (logout, different browser,
      // cleared cache). Best-effort: missing fields → no-op, preserves
      // today's behavior on older servers.
      const verifyData = (profile as any) ?? {};
      if (
        verifyData?.hasSubmittedApplication === true &&
        typeof verifyData?.submittedApplicationId === "string" &&
        verifyData.submittedApplicationId
      ) {
        ClientProfileStore.markSubmitted(formatted, verifyData.submittedApplicationId);
      }

      const localProfile = ClientProfileStore.getProfile(formatted);
      const next = resolveOtpNextStep(localProfile);

      if (next.action === "portal") {
        navigate("/portal", { replace: true });
      } else {
        navigate("/apply/step-1", { replace: true });
      }
    } catch (error: any) {
      if (error?.status === 401) {
        setCode("");
        setOtpInputKey((prev) => prev + 1);
        // Do NOT auto-resend here — that was producing the duplicate-OTP / 429 from Twilio.
        // The user can press "Resend" explicitly; that path is gated by sendInFlightRef + cooldown.
        setError("Code expired or incorrect. Request a new code.");
      } else {
        setError("Invalid code. Please try again.");
      }
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
            <OtpInput
              key={otpInputKey}
              length={6}
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="\\d{4,8}"
              onComplete={(value) => {
                setCode(value);
                void handleVerify(value);
              }}
              autoFocus
            />
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
