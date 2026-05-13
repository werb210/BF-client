// BF_CLIENT_BLOCK_v165_MAYA_AUDIENCE_HEADER_v1
import { describe, it, expect, vi, beforeEach } from "vitest";

const apiRequestMock = vi.fn();
vi.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

import { sendMayaMessage } from "@/api/maya";

describe("BF_CLIENT_BLOCK_v165_MAYA_AUDIENCE_HEADER_v1 — client-app/src/api/maya.ts", () => {
  beforeEach(() => apiRequestMock.mockReset());

  it("sendMayaMessage sends X-Maya-Audience: client", async () => {
    apiRequestMock.mockResolvedValueOnce({});
    await sendMayaMessage("hello");
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    const [path, options] = apiRequestMock.mock.calls[0];
    expect(path).toBe("/api/maya/message");
    expect(options?.method).toBe("POST");
    expect(options?.body).toMatchObject({ message: "hello" });
    const headers = options?.headers as Record<string, string>;
    expect(headers?.["X-Maya-Audience"]).toBe("client");
  });
});
