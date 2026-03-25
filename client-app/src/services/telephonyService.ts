import { apiRequest } from "@/lib/api";
import { TelephonyToken } from "@/contracts";
import { hasToken } from "@/lib/auth";
import { logClientError } from "@/lib/logger";

type CallStatus = {
  status: string;
  activeCall: boolean;
  timestamp?: string;
};

export async function getTelephonyToken() {
  const res = await apiRequest("/telephony/token");

  const parsed = TelephonyToken.response.parse({
    ok: true,
    data: res,
  });

  return parsed.data.token;
}

export async function getCallStatus(): Promise<CallStatus> {
  if (!hasToken()) {
    return {
      status: "offline",
      activeCall: false,
    };
  }

  try {
    await getTelephonyToken();

    return {
      status: "online",
      activeCall: false,
    };
  } catch (error) {
    logClientError("Client telephony polling error", error);

    return {
      status: "offline",
      activeCall: false,
    };
  }
}
