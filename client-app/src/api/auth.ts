const API_BASE = "";

async function request(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth API failure: ${res.status} ${text}`);
  }

  return res.json();
}

// Twilio Verify ONLY
export async function sendOtp(phone) {
  if (!phone) throw new Error("phone required");
  return request("/auth/send-otp", { phone });
}

export async function verifyOtp(phone, code) {
  if (!phone || !code) {
    throw new Error("phone + code required");
  }

  const result = await request("/auth/verify-otp", { phone, code });

  if (!result.success) {
    throw new Error("OTP rejected by Twilio");
  }

  return result;
}
