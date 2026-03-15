export async function startOtp(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "").trim();

  const res = await fetch("https://server.boreal.financial/api/auth/otp/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      phone: normalized
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OTP start failed: ${text}`);
  }

  return res.json();
}
