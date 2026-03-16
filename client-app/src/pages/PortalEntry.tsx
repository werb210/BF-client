import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Card } from "../components/ui/Card";
import { PhoneInput } from "../components/ui/PhoneInput";
import { PrimaryButton } from "../components/ui/Button";
import { OtpInput } from "../components/OtpInput";
import { ClientProfileStore } from "../state/clientProfiles";
import { components, layout, scrollToFirstError } from "@/styles";
import { normalizeOtpPhone, startOtp, verifyOtp } from "@/services/auth";
import { setToken } from "@/auth/tokenStorage";
import { ensureClientSession, setActiveClientSessionToken } from "@/state/clientSession";

export function PortalEntry() {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const verifyInFlightRef = useRef(false);
  const lastAutoSubmittedRef = useRef("");

  useEffect(() => {
    const lastPhone = ClientProfileStore.getLastUsedPhone();
    if (lastPhone) {
      setPhone(lastPhone);
    }
  }, []);

  useEffect(() => {
    if (error) {
      scrollToFirstError();
    }
  }, [error]);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sendingOtp) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const phoneInputValue = String(formData.get("phone") || "");
    const fallbackPhone = phoneInputValue || phone;
    const normalized = normalizeOtpPhone(fallbackPhone);

    if (!normalized) {
      setError("Enter the phone number used for your application.");
      return;
    }

    setSendingOtp(true);
    setError("");

    try {
      const result = await startOtp(normalized);

      // If backend did not confirm success, stay on phone step and show error
      if (!result || !result.ok) {
        if (result?.status === 429) {
          setError(result?.message || "Code already sent. Please wait a moment.");
        } else {
          setError(result?.message || "Failed to send verification code");
        }
        return;
      }

      // Only advance when OTP start succeeded
      setOtpCode("");
      setOtpSessionId(result?.otpSessionId || "");
      setVerifying(false);
      setStep("code");

    } catch (err) {
      console.error("OTP start error:", err);
      setError("Failed to send verification code");
    } finally {
      setSendingOtp(false);
    }
  }

  const handleVerifyOtp = useCallback(async () => {
    if (verifyInFlightRef.current || verifying) {
      return;
    }

    if (!otpSessionId) {
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      return;
    }

    verifyInFlightRef.current = true;
    setVerifying(true);
    setError("");

    try {
      const normalizedPhone = phone.trim();
      const code = String(otpCode).trim();
      const result = await verifyOtp(normalizedPhone, code, otpSessionId);

      if (!result?.ok || !result?.sessionToken) {
        setError("Invalid code. Please try again.");
        return;
      }

      const sessionToken = result.sessionToken as string;

      setToken(sessionToken);
      setActiveClientSessionToken(sessionToken);
      ensureClientSession({
        submissionId: normalizedPhone,
        accessToken: sessionToken,
      });

      ClientProfileStore.setLastUsedPhone(normalizedPhone);
      window.location.href = "/portal";
    } catch (err) {
      setError("Invalid code. Please try again.");
    } finally {
      verifyInFlightRef.current = false;
      setVerifying(false);
    }
  }, [otpCode, otpSessionId, phone, verifying]);


  useEffect(() => {
    if (otpCode.length !== 6) {
      lastAutoSubmittedRef.current = "";
    }
  }, [otpCode]);

  useEffect(() => {
    const autoSubmitKey = `${otpSessionId}:${otpCode}`;
    if (
      step === "code" &&
      otpCode.length === 6 &&
      otpSessionId &&
      !verifying &&
      !verifyInFlightRef.current &&
      lastAutoSubmittedRef.current !== autoSubmitKey
    ) {
      lastAutoSubmittedRef.current = autoSubmitKey;
      void handleVerifyOtp();
    }
  }, [handleVerifyOtp, otpCode, otpSessionId, step, verifying]);

  return (
    <div style={layout.page}>
      <div style={layout.centerColumn}>
        <Card>
          <div style={layout.stackTight}>
            <div style={components.form.eyebrow}>Client portal</div>
            <h1 style={components.form.title}>Verify your phone</h1>
            <p style={components.form.subtitle}>
              We send a new one-time passcode every time you visit your portal.
            </p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handleSendCode}>
              <div style={layout.stackTight} data-error={Boolean(error)}>
                <label htmlFor="portal-phone" style={components.form.label}>
                  Phone number
                </label>
                <PhoneInput
                  id="portal-phone"
                  name="phone"
                  value={phone}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)}
                  placeholder="(555) 555-5555"
                  hasError={Boolean(error)}
                  onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                    }
                  }}
                />
                {error && (
                  <div style={components.form.errorText} data-error={true}>
                    {error}
                  </div>
                )}
              </div>

              <PrimaryButton style={{ width: "100%" }} type="submit" disabled={sendingOtp}>
                {sendingOtp ? "Sending..." : "Send code"}
              </PrimaryButton>
            </form>
          ) : (
            <div style={layout.stackTight}>
              <div style={components.form.helperText}>
                Enter the 6-digit code sent to your phone.
              </div>
              <OtpInput length={6} onComplete={setOtpCode} />
              <PrimaryButton
                style={{ width: "100%" }}
                onClick={handleVerifyOtp}
                disabled={otpCode.length !== 6 || verifying || !otpSessionId}
              >
                {verifying ? "Verifying..." : "Verify code"}
              </PrimaryButton>
              {error && (
                <div style={components.form.errorText} data-error={true}>
                  {error}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
