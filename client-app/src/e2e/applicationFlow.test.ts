import { describe, expect, test } from "vitest";

const API = process.env.API_URL;

let token: string;

if (!API) {
  throw new Error("API_URL is required for E2E tests.");
}

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

    if (json.status !== "ok") {
      console.error("E2E FAILURE:", json);
    }

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

    if (json.status !== "ok") {
      console.error("E2E FAILURE:", json);
    }

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

    if (json.status !== "ok") {
      console.error("E2E FAILURE:", json);
    }

    expect(json.status).toBe("ok");
    expect(Array.isArray(json.data)).toBe(true);
  });
});
