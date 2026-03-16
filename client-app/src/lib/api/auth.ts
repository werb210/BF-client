function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}

export async function startOtp(phoneInput: string) {
  const payload = {
    phone: normalizePhone(phoneInput)
  }

  const res = await fetch("/api/auth/otp/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OTP start failed: ${text}`);
  }

  return res.json();
}
