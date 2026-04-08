import { apiRequest } from "./apiClient";

type TokenResponse = {
  token: string;
};

export async function getTelephonyToken(): Promise<string> {
  const data = await apiRequest<TokenResponse>(
    "/api/v1/telephony/token",
    { method: "GET" }
  );

  return data.token;
}
