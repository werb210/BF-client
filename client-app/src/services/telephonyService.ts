import { apiRequest } from "../api/request";
import { API_ENDPOINTS } from "../api/endpoints";
import { hasToken } from "@/lib/auth";
import { logClientError } from "@/lib/logger";

type CallStatus = {
  status: string;
  activeCall: boolean;
  timestamp?: string;
};

export async function getCallStatus(): Promise<CallStatus> {
  if (!hasToken()) {
    return {
      status: "offline",
      activeCall: false,
    };
  }

  try {
    const data = await apiRequest<{ token?: string }>(API_ENDPOINTS.TELEPHONY_TOKEN, {
      method: "GET",
    });

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
