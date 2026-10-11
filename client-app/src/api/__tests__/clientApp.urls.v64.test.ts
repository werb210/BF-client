// BF_CLIENT_v64_CLIENTAPP_URLS - status and messages call the routes the server
// actually serves: GET /api/client/application/:id/status (singular, /status
// suffix, wrapped in { status: {...} }) and GET /api/client/messages?applicationId=.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ ENV: { API_BASE: "https://api.test" } }));
vi.mock("@/auth/token", () => ({ getToken: () => "jwt-1" }));

import { ClientAppAPI } from "../clientApp";

let urls: string[] = [];
let reply: unknown = {};

beforeEach(() => {
  urls = [];
  reply = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify(reply), { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BF_CLIENT_v64_CLIENTAPP_URLS", () => {
  it("status() reads /api/client/application/:id/status and unwraps the status object", async () => {
    reply = { status: { applicationId: "app 1", pipelineState: "In Review" } };
    const res = await ClientAppAPI.status("app 1");
    expect(urls).toEqual(["https://api.test/api/client/application/app%201/status"]);
    expect(res.data).toEqual({ applicationId: "app 1", pipelineState: "In Review" });
  });

  it("getApplication() uses the same canonical status route", async () => {
    reply = { status: { applicationId: "app-2", processingStage: "docs" } };
    const res = await ClientAppAPI.getApplication("app-2");
    expect(urls).toEqual(["https://api.test/api/client/application/app-2/status"]);
    expect(res.data).toEqual({ applicationId: "app-2", processingStage: "docs" });
  });

  it("status() keeps a flat body when the server does not wrap it", async () => {
    reply = { pipelineState: "Received" };
    const res = await ClientAppAPI.status("app-3");
    expect(res.data).toEqual({ pipelineState: "Received" });
  });

  it("getMessages() reads /api/client/messages?applicationId= and returns the unwrapped list", async () => {
    reply = { status: "ok", data: [{ id: "m1", body: "hi" }] };
    const res = await ClientAppAPI.getMessages("app/4");
    expect(urls).toEqual(["https://api.test/api/client/messages?applicationId=app%2F4"]);
    expect(res.data).toEqual([{ id: "m1", body: "hi" }]);
  });
});
