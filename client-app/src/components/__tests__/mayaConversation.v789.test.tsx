/* @vitest-environment jsdom */
// BF_CLIENT_v789_MAYA_CONVERSATION_TOKEN + BF_CLIENT_v789_MAYA_SESSION_ID
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));
vi.mock("react-router-dom", () => ({ useLocation: () => ({ pathname: "/apply/step-1" }) }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { name: "Taylor Doe", phone: "4035551234", email: "t@example.com" } }) }));
vi.mock("@/state/useApplicationStore", () => ({ useApplicationStore: () => ({ app: { applicationToken: null } }) }));
vi.mock("@/auth/token", () => ({ getToken: (): null => null }));

import MayaWidget, { getOrCreateMayaSessionId, MAYA_SESSION_KEY } from "../MayaWidget";
import {
  clearConversation,
  conversationHeaders,
  CONVERSATION_ENDED_MESSAGE,
  CONVERSATION_TOKEN_HEADER,
  isConversationAuthError,
  loadConversation,
  MAYA_CONVERSATION_KEY,
  saveConversation,
} from "../mayaConversation";

type Call = [string, { method?: string; headers?: Record<string, string>; body?: unknown }];

describe("conversation token store", () => {
  beforeEach(() => {
    clearConversation();
    sessionStorage.clear();
  });

  it("keeps the token with the conversation in memory and sessionStorage", () => {
    saveConversation("conv-1", "tok-1");
    expect(loadConversation()).toEqual({ conversationId: "conv-1", visitorToken: "tok-1" });
    expect(JSON.parse(sessionStorage.getItem(MAYA_CONVERSATION_KEY) || "{}").visitorToken).toBe("tok-1");
    expect(conversationHeaders(loadConversation())).toEqual({ [CONVERSATION_TOKEN_HEADER]: "tok-1" });
  });

  it("works without a token (a server older than v789)", () => {
    saveConversation("conv-2", undefined);
    expect(conversationHeaders(loadConversation())).toEqual({});
  });

  it("clears both copies", () => {
    saveConversation("conv-1", "tok-1");
    clearConversation();
    expect(loadConversation()).toBeNull();
    expect(sessionStorage.getItem(MAYA_CONVERSATION_KEY)).toBeNull();
  });

  it("treats only 401 and 403 as an auth failure", () => {
    expect(isConversationAuthError({ status: 401 })).toBe(true);
    expect(isConversationAuthError({ status: 403 })).toBe(true);
    expect(isConversationAuthError({ status: 500 })).toBe(false);
    expect(isConversationAuthError(new Error("offline"))).toBe(false);
  });
});

describe("Maya session id", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => window.history.replaceState({}, "", "/"));

  it("is generated in the app and never taken from the URL", () => {
    window.history.replaceState({}, "", "/apply/step-1?sessionId=attacker-session&readinessSession=other");
    const id = getOrCreateMayaSessionId();
    expect(id).not.toContain("attacker");
    expect(id).not.toContain("other");
    expect(id).toMatch(/^client-/);
    expect(getOrCreateMayaSessionId()).toBe(id);
  });

  it("replaces an id that an older build copied from a URL", () => {
    localStorage.setItem(MAYA_SESSION_KEY, "attacker-session");
    expect(getOrCreateMayaSessionId()).toMatch(/^client-/);
  });
});

describe("talk to a human", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    clearConversation();
    sessionStorage.clear();
    apiRequest.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function escalate(escalateReply: Record<string, unknown>) {
    await act(async () => { root.render(<MayaWidget />); });
    await act(async () => { window.dispatchEvent(new CustomEvent("maya:open", { detail: { mode: "chat" } })); });
    const talk = Array.from(document.body.querySelectorAll("button")).find((b) => /Talk to a Human/.test(b.textContent || ""));
    expect(talk).toBeTruthy();
    apiRequest.mockImplementation(async (path: string) => {
      if (path === "/api/maya/escalate") return escalateReply;
      return { messages: [] };
    });
    await act(async () => {
      talk!.click();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  function pollCalls(): Call[] {
    return (apiRequest.mock.calls as Call[]).filter(([path]) => /\/api\/public\/conversation\/.+\/messages$/.test(path));
  }

  it("stores the visitor token and sends it on every conversation request", async () => {
    await escalate({ conversation_id: "conv-9", visitor_token: "tok-9" });
    expect(loadConversation()).toEqual({ conversationId: "conv-9", visitorToken: "tok-9" });
    await vi.waitFor(() => expect(pollCalls().length).toBeGreaterThan(0));
    expect(pollCalls()[0][1].headers).toEqual({ [CONVERSATION_TOKEN_HEADER]: "tok-9" });

    const input = document.body.querySelector<HTMLInputElement>('input[placeholder="Type a message…"]')!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "Hello team");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      input.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    const post = (apiRequest.mock.calls as Call[]).find(([path, init]) => path === "/api/public/conversation/conv-9/message" && init.method === "POST");
    expect(post?.[1].headers).toEqual({ [CONVERSATION_TOKEN_HEADER]: "tok-9" });
  });

  it("sends no header when the server issued no token", async () => {
    await escalate({ conversation_id: "conv-old" });
    await vi.waitFor(() => expect(pollCalls().length).toBeGreaterThan(0));
    expect(pollCalls()[0][1].headers).toEqual({});
  });

  it("clears the token and tells the client to start again on 401/403", async () => {
    await act(async () => { root.render(<MayaWidget />); });
    saveConversation("conv-x", "expired");
    apiRequest.mockImplementation(async (path: string) => {
      if (/\/messages$/.test(path)) throw Object.assign(new Error("HTTP 401"), { status: 401 });
      return {};
    });
    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await act(async () => { root.render(<MayaWidget />); });
    await act(async () => { window.dispatchEvent(new CustomEvent("maya:open", { detail: { mode: "chat" } })); });
    await vi.waitFor(() => expect(loadConversation()).toBeNull());
    await vi.waitFor(() => expect(document.body.textContent).toContain(CONVERSATION_ENDED_MESSAGE));
  });
});
