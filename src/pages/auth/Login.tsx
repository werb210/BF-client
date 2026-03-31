import { useState } from "react";
import { sendOtp, verifyOtp } from "@/api/auth";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");

  async function handleSend() {
    await sendOtp(phone);
    setStep("code");
  }

  async function handleVerify() {
    await verifyOtp(phone, code);
    window.location.href = "/";
  }

  return (
    <div>
      {step === "phone" && (
        <>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button onClick={handleSend}>Send OTP</button>
        </>
      )}
      {step === "code" && (
        <>
          <input value={code} onChange={(e) => setCode(e.target.value)} />
          <button onClick={handleVerify}>Verify</button>
        </>
      )}
    </div>
  );
}
