import { useState } from "react";
import type React from "react";
import { startOtp, verifyOtp } from "../api/auth";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    await startOtp(phone);
    setSent(true);
  };

  const handleVerify = async () => {
    await verifyOtp(phone, code);

    await new Promise((r) => setTimeout(r, 200));

    const token = localStorage.getItem("auth_token");

    if (!token) {
      throw new Error("Auth failed");
    }

    alert("SUCCESS");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sent) {
      void handleVerify();
      return;
    }
    void handleSend();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={phone} onChange={e => setPhone(e.target.value)} />
      {!sent && <button type="submit">Send OTP</button>}
      {sent && (
        <>
          <input value={code} onChange={e => setCode(e.target.value)} />
          <button type="submit">Verify</button>
        </>
      )}
    </form>
  );
}
