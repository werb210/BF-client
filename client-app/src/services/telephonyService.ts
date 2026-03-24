import { apiRequest } from "@/lib/api";
import { hasToken } from "@/lib/auth";
import { logClientError } from "@/lib/logger";

type CallStatus = {
  status: string;
  activeCall: boolean;
  timestamp?: string;
};

export const getToken = () => apiRequest<{ token?: string }>("/telephony/token");

export async function getCallStatus(): Promise<CallStatus> {
  if (!hasToken()) {
    return {
      status: "offline",
      activeCall: false,
    };
  }

  try {
    const data = await getToken();

    if (!data?.token) {
      throw new Error("Invalid telephony token response");
    }

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
