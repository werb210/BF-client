// BF_CLIENT_BLOCK_v165_MAYA_AUDIENCE_HEADER_v1
import { describe, it, expect, vi, beforeEach } from "vitest";

const apiCallMock = vi.fn();
vi.mock("@/lib/api", () => ({
  apiCall: (...args: unknown[]) => apiCallMock(...args),
}));

import { sendMessageToMaya, escalateMayaChat, joinStartupWaitlist } from "@/services/mayaService";

describe("BF_CLIENT_BLOCK_v165_MAYA_AUDIENCE_HEADER_v1 — client-app/src/services/mayaService.ts", () => {
  beforeEach(() => apiCallMock.mockReset());

  it("sendMessageToMaya sends X-Maya-Audience: client", async () => {
    apiCallMock.mockResolvedValueOnce({});
    await sendMessageToMaya("hi");
    expect(apiCallMock).toHaveBeenCalledTimes(1);
    const [path, options] = apiCallMock.mock.calls[0];
    expect(path).toBe("/api/maya/message");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toEqual({ message: "hi" });
    const headers = options?.headers as Record<string, string>;
    expect(headers?.["X-Maya-Audience"]).toBe("client");
  });

  it("escalateMayaChat sends X-Maya-Audience: client", async () => {
    apiCallMock.mockResolvedValueOnce({});
    await escalateMayaChat();
    expect(apiCallMock).toHaveBeenCalledTimes(1);
    const [path, options] = apiCallMock.mock.calls[0];
    expect(path).toBe("/api/maya/escalate");
    expect(options?.method).toBe("POST");
    const headers = options?.headers as Record<string, string>;
    expect(headers?.["X-Maya-Audience"]).toBe("client");
  });

  it("joinStartupWaitlist does NOT carry a Maya audience header (unrelated)", async () => {
    apiCallMock.mockResolvedValueOnce({});
    await joinStartupWaitlist({ name: "A", email: "a@b.c", phone: "+1" });
    const [, options] = apiCallMock.mock.calls[0];
    const headers = (options?.headers as Record<string, string> | undefined) ?? {};
    expect(headers["X-Maya-Audience"]).toBeUndefined();
  });
});
