import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/client";
import { fetchPrefill } from "../prefill";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("utils/prefill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns prefill when found is true", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { found: true, prefill: { fullName: "X" } },
      status: 200,
      headers: new Headers(),
    });

    await expect(fetchPrefill("token-123")).resolves.toEqual({ fullName: "X" });
  });

  it("returns null when found is false", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { found: false },
      status: 200,
      headers: new Headers(),
    });

    await expect(fetchPrefill("token-123")).resolves.toBeNull();
  });

  it("returns null when request throws", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("boom"));

    await expect(fetchPrefill("token-123")).resolves.toBeNull();
  });

  it("returns null and does not request when token is empty", async () => {
    await expect(fetchPrefill("")).resolves.toBeNull();
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
