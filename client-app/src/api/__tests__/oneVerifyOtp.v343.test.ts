// BF_CLIENT_ONE_VERIFY_OTP_v343
// Two verifyOtp functions existed and only one sent userType. Whichever the
// sign-in page imported decided whether the client app got a client token or
// a staff one. api/client.ts no longer has its copy (BF_CLIENT_v789_DEAD_CODE);
// api/auth.ts is the one verify, and it must say this is a client sign-in.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ ENV: { API_BASE: "https://api.test" } }));

import * as auth from "../auth";
import * as client from "../client";
import { getToken, clearToken } from "@/auth/token";

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
let status = 200;
let reply: unknown = {};

beforeEach(() => {
  calls = [];
  status = 200;
  reply = { status: "ok", data: { token: "client-jwt" } };
  clearToken();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(reply), { status });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

describe("every OTP verify declares itself as a client sign-in", () => {
  it("api/auth verifyOtp posts phone, code and userType client to the verify route", async () => {
    await auth.verifyOtp("+15875551234", "123456");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.test/api/auth/otp/verify");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ phone: "+15875551234", code: "123456", userType: "client" });
  });

  it("stores the client token the server returns", async () => {
    const data = await auth.verifyOtp("+15875551234", "123456");
    expect(data).toEqual({ token: "client-jwt" });
    expect(getToken()).toBe("client-jwt");
  });

  it("turns a 401 into a request for a new code", async () => {
    status = 401;
    reply = { error: "invalid_code" };
    await expect(auth.verifyOtp("+15875551234", "000000")).rejects.toMatchObject({
      message: "Code expired or incorrect. Request a new code.",
      status: 401,
    });
    expect(getToken()).toBeNull();
  });

  it("there is no second verify to import from api/client", () => {
    expect("verifyOtp" in client).toBe(false);
    expect("startOtp" in client).toBe(false);
  });
});
