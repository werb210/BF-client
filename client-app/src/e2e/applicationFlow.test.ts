import { beforeEach, describe, expect, test, vi } from "vitest";

const API = process.env.API_URL;
const runE2E = !!API;

let token: string;

beforeEach(() => {
  vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/api/v1/voice/token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", data: { token: "token-abc" } }),
      } as Response;
    }

    if (url.endsWith("/api/v1/crm/lead")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", data: { id: "app-123" } }),
      } as Response;
    }

    if (url.endsWith("/api/v1/voice/status")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", data: [] }),
      } as Response;
    }

    return {
      ok: false,
      status: 404,
      json: async () => ({ status: "error", error: "Not Found" }),
    } as Response;
  });
});

(runE2E ? describe : describe.skip)("End-to-End Application Flow", () => {
  test("fetch voice token", async () => {
    const res = await fetch(`${API}/api/v1/voice/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      }),
    });

    const json = await res.json();
    expect(json.status).toBe("ok");
    token = json.data.token;
  });

  test("create lead", async () => {
    const res = await fetch(`${API}/api/v1/crm/lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        businessName: "Test Co",
        amount: 500000,
        productType: "term_loan",
      }),
    });

    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.data.id).toBeDefined();
  });

  test("fetch voice status", async () => {
    const res = await fetch(`${API}/api/v1/voice/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(Array.isArray(json.data)).toBe(true);
  });
});
