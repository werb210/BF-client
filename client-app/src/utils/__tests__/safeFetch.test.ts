import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeFetch } from "../safeFetch";
import { apiCall } from "@/api/client";

vi.mock("@/api/client", () => ({
  apiCall: vi.fn(),
}));

describe("utils/safeFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns data when the API call succeeds", async () => {
    vi.mocked(apiCall).mockResolvedValueOnce({ id: "123" });

    await expect(safeFetch("/api/test")).resolves.toEqual({ id: "123" });
  });

  it("returns degraded mode result when backend reports DB_NOT_READY", async () => {
    vi.mocked(apiCall).mockRejectedValueOnce(new Error("DB_NOT_READY"));

    await expect(safeFetch("/api/test")).resolves.toEqual({ degraded: true });
  });

  it("throws for non-degraded backend errors", async () => {
    vi.mocked(apiCall).mockRejectedValueOnce(new Error("SOME_OTHER_ERROR"));

    await expect(safeFetch("/api/test")).rejects.toThrow("SOME_OTHER_ERROR");
  });
});
