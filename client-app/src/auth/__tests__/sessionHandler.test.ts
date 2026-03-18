import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleAuthError } from "../sessionHandler";
import {
  ensureClientSession,
  getClientSessionByToken,
  getClientSessionState,
  setActiveClientSessionToken,
} from "../../state/clientSession";

describe("handleAuthError", () => {
  beforeEach(() => {
    vi.spyOn(localStorage, "getItem").mockReturnValue(null);
    vi.spyOn(localStorage, "setItem").mockImplementation(() => undefined);
    vi.spyOn(localStorage, "removeItem").mockImplementation(() => undefined);
    vi.spyOn(sessionStorage, "getItem").mockReturnValue(null);
    vi.spyOn(sessionStorage, "setItem").mockImplementation(() => undefined);
    vi.spyOn(sessionStorage, "removeItem").mockImplementation(() => undefined);
  });

  it("marks the active session as revoked on auth failures", async () => {
    const accessToken = "token-123";
    ensureClientSession({ submissionId: "sub-1", accessToken });
    setActiveClientSessionToken(accessToken);

    const error = {
      response: { status: 401 },
      config: {},
    };

    await expect(handleAuthError(error)).rejects.toBe(error);

    const session = getClientSessionByToken(accessToken);
    expect(session).not.toBeNull();
    expect(getClientSessionState(session!)).toBe("revoked");
  });
});
