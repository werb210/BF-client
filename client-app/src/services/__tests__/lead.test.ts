import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiRequestMock = vi.fn();
let storage = new Map<string, string>();

vi.mock("@/lib/api", () => ({
  apiRequest: apiRequestMock,
}));

describe("createLead dedupe", () => {
  beforeEach(() => {
    storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, String(value));
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => {
        storage.clear();
      }),
    });
    apiRequestMock.mockReset();
    localStorage.clear();
  });

  it("reuses existing lead by email/phone", async () => {
    const { createLead } = await import("../lead");

    apiRequestMock.mockResolvedValue({ leadId: "lead-1", pendingApplicationId: "app-1" });

    const payload = {
      companyName: "ACME",
      fullName: "Taylor",
      email: "taylor@example.com",
      phone: "+15555555555",
    };

    const first = await createLead(payload);
    const second = await createLead(payload);

    expect(first.leadId).toBe("lead-1");
    expect(second.leadId).toBe("lead-1");
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
