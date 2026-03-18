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
    const data = await apiRequest<Partial<CallStatus>>(API_ENDPOINTS.TELEPHONY_PRESENCE, {
      method: "GET",
    });

    return {
      status: data?.status ?? "unknown",
      activeCall: data?.activeCall ?? false,
      timestamp: data?.timestamp,
    };
  } catch (error) {
    logClientError("Client telephony polling error", error);

    return {
      status: "offline",
      activeCall: false,
    };
  }
}
