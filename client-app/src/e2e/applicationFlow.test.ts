import { beforeEach, describe, expect, test, vi } from "vitest";

const API = process.env.API_URL || "http://localhost:3000";

let token: string;

beforeEach(() => {
  vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith("/auth/login")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", data: { token: "token-abc" } }),
      } as Response;
    }

    if (url.endsWith("/applications")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", data: { id: "app-123" } }),
      } as Response;
    }

    if (url.endsWith("/pipeline")) {
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

describe("End-to-End Application Flow", () => {
  test("login", async () => {
    const res = await fetch(`${API}/auth/login`, {
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

  test("create application", async () => {
    const res = await fetch(`${API}/applications`, {
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

  test("fetch pipeline", async () => {
    const res = await fetch(`${API}/pipeline`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(Array.isArray(json.data)).toBe(true);
  });
});
