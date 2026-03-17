import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import { Card } from "../components/ui/Card";
import { PhoneInput } from "../components/ui/PhoneInput";
import { PrimaryButton } from "../components/ui/Button";
import { OtpInput } from "../components/OtpInput";
import { ClientProfileStore } from "../state/clientProfiles";
import { components, layout, scrollToFirstError } from "@/styles";
import { startOtp, verifyOtp } from "@/services/auth";
import { setToken } from "@/auth/tokenStorage";
import { ensureClientSession, setActiveClientSessionToken } from "@/state/clientSession";

export function PortalEntry() {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!fallbackPhone.trim()) {
      setError("Enter the phone number used for your application.");
      return;
    }

    setSendingOtp(true);
    setError(null);

    try {
      const result = await startOtp(fallbackPhone);

      if (!result?.ok) {
        setError(result?.message || "Failed to send verification code");
        return;
      }

      const verifiedPhone = result?.normalizedPhone || result?.phone || fallbackPhone;
      setNormalizedPhone(verifiedPhone);
      setOtpCode("");
      setOtpSessionId(result.otpSessionId || "");
      setVerifying(false);
      setStep("code");
    } catch (err: any) {
      console.error("OTP start error:", err);
      setError(err?.response?.data?.error?.message || "Failed to send verification code");
    } finally {
      setSendingOtp(false);
    }
  }

  const onVerify = useCallback(async () => {
    if (verifyInFlightRef.current || verifying) {
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      return;
    }

    verifyInFlightRef.current = true;
    setVerifying(true);
    setError(null);

    try {
      const verifyPhone = normalizedPhone || phone;
      const result = await verifyOtp(verifyPhone, otpCode);

      if (!result.success) {
        const message = typeof result?.error === "string" ? result.error : typeof result?.message === "string" ? result.message : "Authentication failed";
        throw new Error(message);
      }

      const sessionToken = result.data?.token || result.data?.sessionToken;
      if (!sessionToken) {
        throw new Error("Authentication failed");
      }

      setToken(sessionToken);
      localStorage.setItem("auth_token", sessionToken);
      setActiveClientSessionToken(sessionToken);

      const persistedPhone = (normalizedPhone || phone).trim();
      ensureClientSession({
        submissionId: persistedPhone,
        accessToken: sessionToken,
      });

      const applicationToken = (result?.data?.applicationToken || result?.data?.applicationId) as string | undefined;
      const submittedToken = result?.data?.submittedToken as string | undefined;
      if (applicationToken) {
        ClientProfileStore.upsertProfile(persistedPhone, applicationToken);
      }
      if (submittedToken) {
        ClientProfileStore.markSubmitted(persistedPhone, submittedToken);
      }
      ClientProfileStore.markPortalVerified(sessionToken);
      ClientProfileStore.setLastUsedPhone(persistedPhone);

      window.location.href = result.nextPath;
    } catch (err: any) {
      setOtpCode("");
      setError(err.message || "Authentication failed");
    } finally {
      verifyInFlightRef.current = false;
      setVerifying(false);
    }
  }, [normalizedPhone, otpCode, otpSessionId, phone, verifying]);


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
      !verifying &&
      !verifyInFlightRef.current &&
      lastAutoSubmittedRef.current !== autoSubmitKey
    ) {
      lastAutoSubmittedRef.current = autoSubmitKey;
      void onVerify();
    }
  }, [onVerify, otpCode, otpSessionId, step, verifying]);

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
                onClick={onVerify}
                disabled={otpCode.length !== 6 || verifying}
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
