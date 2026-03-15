export async function startOtp(phone: string) {
  const response = await fetch("https://server.boreal.financial/api/auth/otp/start", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phone: phone
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OTP start failed: ${error}`);
  }

  return response.json();
}
