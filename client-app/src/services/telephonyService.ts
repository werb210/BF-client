import { getVoiceToken } from "@/api/telephony";
import { hasToken } from "@/lib/auth";
import { logClientError } from "@/lib/logger";

type CallStatus = {
  status: string;
  activeCall: boolean;
  timestamp?: string;
};

export async function getTelephonyToken() {
  return getVoiceToken();
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
