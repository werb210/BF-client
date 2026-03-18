import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.fn().mockResolvedValue({ data: { ok: true } });
let storage = new Map<string, string>();

vi.mock("@/api/client", () => ({
  default: {
    post: postMock,
  },
}));

describe("submitApplication", () => {
  type TrackingParams = {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_term: string | null;
    utm_content: string | null;
    gclid: string | null;
    msclkid: string | null;
    ga_client_id: string | null;
  };

  const expectedAttribution: TrackingParams = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
    gclid: null,
    msclkid: null,
    ga_client_id: null,
  };

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
    postMock.mockClear();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends idempotency key when provided", async () => {
    const { submitApplication } = await import("../applications");
    await submitApplication({ hello: "world" }, { idempotencyKey: "idem-123" });
    expect(postMock).toHaveBeenCalledWith(
      "/api/client/applications",
      { hello: "world", ...expectedAttribution, creditSessionToken: null }
    );
  });

  it("includes continuation token when provided", async () => {
    const { submitApplication } = await import("../applications");
    await submitApplication(
      { hello: "world" },
      { idempotencyKey: "idem-123", continuationToken: "cont-456" }
    );
    expect(postMock).toHaveBeenCalledWith(
      "/api/client/applications",
      {
        hello: "world",
        ...expectedAttribution,
        continuationToken: "cont-456",
        creditSessionToken: null,
      }
    );
  });

  it("includes the persisted credit session token", async () => {
    localStorage.setItem("creditSessionToken", "bridge-token-123");

    const { submitApplication } = await import("../applications");
    await submitApplication({ hello: "world" });

    expect(postMock).toHaveBeenCalledWith(
      "/api/client/applications",
      {
        hello: "world",
        ...expectedAttribution,
        creditSessionToken: "bridge-token-123",
      }
    );
  });
});
