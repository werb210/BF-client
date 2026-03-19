import { useState } from "react";
import { sendOtp, verifyOtp } from "../api/auth";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    await sendOtp(phone);
    setSent(true);
  };

  const handleVerify = async () => {
    await verifyOtp(phone, code);
    alert("SUCCESS");
  };

  return (
    <div>
      <input value={phone} onChange={e => setPhone(e.target.value)} />
      {!sent && <button onClick={handleSend}>Send OTP</button>}
      {sent && (
        <>
          <input value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={handleVerify}>Verify</button>
        </>
      )}
    </div>
  );
}
