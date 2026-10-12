// BF_CLIENT_v789_MINI_PORTAL_HARNESS
// Shared render harness for MiniPortalPage behaviour tests. Test-only code: it is
// imported by *.test.tsx files and never by the app.
//
// Importing this module mocks every network edge of the page (apiCall, fetch,
// the Twilio Device, Capacitor, the microphone check) and swaps the heavy child
// components (forms, DocPicker, ActionCenter, header/account bar...) for small
// stubs whose props the tests can read and drive. Then renderPortal() mounts the
// real page inside a MemoryRouter and reports where it navigated.
//
// vi.mock calls made here are registered before MiniPortalPage is imported below,
// so they apply to every test file that imports the harness. A test file must not
// vi.mock the same modules again.
import { act, render, type RenderResult } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import { afterEach, beforeEach, vi } from "vitest";

type CallHandler = (...args: unknown[]) => void;

export type FakeCall = {
  handlers: Record<string, CallHandler[]>;
  on: (event: string, cb: CallHandler) => void;
  emit: (event: string, ...args: unknown[]) => void;
  disconnect: ReturnType<typeof vi.fn>;
};

export type FakeDevice = {
  token: string;
  register: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  call: FakeCall | null;
};

export type ActionCenterProps = {
  applicationId: string;
  onAction?: (item: { key: string; kind: string; label: string; urgent?: boolean; action?: string }) => void;
  onData?: (d: { outstanding: Array<{ key: string; kind: string; label?: string }>; completed: Array<{ key: string; kind: string; label?: string }> }) => void;
  refreshKey?: number;
  extraItems?: Array<{ key: string; kind: string; label: string; action?: string }>;
};

export type ApiRoute = unknown | ((url: string, init?: { method?: string; body?: unknown }) => unknown);
export type FetchRoute = (url: string, init?: RequestInit) => Response | Promise<Response>;

const h = vi.hoisted(() => ({
  apiCall: vi.fn(),
  fetch: vi.fn(),
  env: { API_BASE: "https://api.test" } as { API_BASE: string },
  token: "tok-123" as string | null,
  native: false,
  app: {} as Record<string, unknown>,
  startNewApplication: vi.fn(),
  wipeSession: vi.fn(async () => undefined),
  microphone: vi.fn(async () => ({ ok: true, reason: "granted", message: null as string | null })),
  devices: [] as unknown[],
  actionCenter: null as unknown,
  docPicker: null as unknown,
  feeModal: null as unknown,
  location: "",
  navigate: null as unknown,
}));

vi.mock("@/api/client", () => ({ apiCall: h.apiCall }));
vi.mock("@/env", () => ({ ENV: h.env }));
vi.mock("@/auth/token", () => ({ getToken: () => h.token }));
vi.mock("@/auth/logout", () => ({ wipeSession: h.wipeSession }));
vi.mock("@/lib/microphone", () => ({ ensureMicrophonePermission: h.microphone }));
vi.mock("@/lib/docUpload", () => ({ pickFiles: vi.fn(), uploadDocumentFiles: vi.fn(async () => ({ status: "ok" })) }));
vi.mock("@/native/clientWidget", () => ({ updateClientWidget: vi.fn(async () => undefined) }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => h.native, getPlatform: () => (h.native ? "ios" : "web"), isPluginAvailable: () => false },
  registerPlugin: () => ({}),
}));
vi.mock("@/state/useApplicationStore", () => ({
  useApplicationStore: () => ({ app: h.app, startNewApplication: h.startNewApplication }),
}));
vi.mock("@twilio/voice-sdk", () => {
  class Device {
    token: string;
    register = vi.fn(async () => undefined);
    call: unknown = null;
    connect = vi.fn(async () => {
      const handlers: Record<string, CallHandler[]> = {};
      const call = {
        handlers,
        on: (event: string, cb: CallHandler) => { (handlers[event] ??= []).push(cb); },
        emit: (event: string, ...args: unknown[]) => { for (const cb of handlers[event] ?? []) cb(...args); },
        disconnect: vi.fn(),
      };
      this.call = call;
      return call;
    });
    constructor(token: string) {
      this.token = token;
      h.devices.push(this);
    }
  }
  return { Device };
});

// Children with their own network or native dependencies are stubbed.
vi.mock("@/components/SlimHeader", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("div", { "data-testid": "slim-header" }, "Boreal") };
});
vi.mock("@/components/AccountBar", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("div", { "data-testid": "account-bar" }, "Sign out") };
});
vi.mock("@/components/install/InstallAppPrompt", () => ({ default: (): null => null }));
vi.mock("@/components/AppUpdateBanner", () => ({ default: (): null => null }));
vi.mock("@/components/onboarding/FeatureTour", () => ({ default: (): null => null }));
vi.mock("@/components/ReactivateHeldFiles", () => ({ default: (): null => null }));
vi.mock("@/components/FeeAgreementSignModal", () => ({
  default: (p: unknown): null => { h.feeModal = p; return null; },
}));
vi.mock("@/components/ActionCenter", async () => {
  const { createElement } = await import("react");
  return { default: (p: unknown) => { h.actionCenter = p; return createElement("div", { "data-testid": "action-center" }); } };
});
vi.mock("@/components/DocPicker", async () => {
  const { createElement } = await import("react");
  return {
    default: (p: { documentType?: string; onClose: () => void }) => {
      h.docPicker = p;
      return createElement("div", { "data-testid": "doc-picker", "data-document-type": p.documentType ?? "" },
        createElement("button", { type: "button", onClick: () => p.onClose() }, "Close picker"));
    },
  };
});

// Each CMP form is a stub that names itself and can report completion.
function formStub(name: string) {
  return async () => {
    const { createElement } = await import("react");
    return {
      default: (p: { applicationId: string; onComplete: () => void }) =>
        createElement("div", { "data-testid": `form-${name}`, "data-application-id": p.applicationId },
          createElement("button", { type: "button", onClick: () => p.onComplete() }, `Finish ${name}`)),
    };
  };
}
vi.mock("@/pages/mini-portal/forms/forms/PersonalNetWorthForm", formStub("networth"));
vi.mock("@/pages/mini-portal/forms/forms/DebtStackForm", formStub("debt"));
vi.mock("@/pages/mini-portal/forms/forms/CraAuthorizationForm", formStub("cra"));
vi.mock("@/pages/mini-portal/forms/forms/FlinksConnectForm", formStub("flinks"));
vi.mock("@/pages/mini-portal/forms/forms/RealEstateCollateralForm", formStub("realestate"));
vi.mock("@/pages/mini-portal/forms/forms/EquipmentCollateralForm", formStub("equipment"));
vi.mock("@/pages/mini-portal/forms/forms/AdvisorsForm", formStub("advisors"));
vi.mock("@/pages/mini-portal/forms/forms/LenderQaForm", formStub("lender_qa"));
vi.mock("@/pages/mini-portal/forms/forms/ProductQuestionsForm", formStub("product_questions"));

import MiniPortalPage from "../MiniPortalPage";

export { h as portalMocks };

/** An error shaped like the ones apiCall throws: the HTTP status on .status. */
export function apiError(status: number, message = `HTTP ${status}`): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function defaultApi(path: string): unknown {
  if (path === "/api/client/applications/by-phone") return { applications: [] };
  if (path === "/api/client/application-stage") return { pipeline_state: "in_review" };
  if (path === "/api/client/messages") return [];
  if (path === "/api/client/offers") return { items: [] };
  if (path === "/api/client/rejected-documents") return { items: [] };
  if (path === "/api/client/documents-needed/needed") return { stillNeeded: [], rejected: [] };
  if (path === "/api/client/signing-session") return { status: "not_ready" };
  if (path === "/api/client/signing-complete") return { signed: false };
  if (path === "/api/client/messages/typing") return { typing: false };
  if (/^\/api\/client\/applications\/[^/]+\/product-questions$/.test(path)) return { missing: [] };
  if (/^\/api\/portal\/applications\/[^/]+\/qa\/open$/.test(path)) return { questions: [] };
  return {};
}

let apiRoutes: Record<string, ApiRoute> = {};
let fetchRoute: FetchRoute | null = null;

/**
 * Answers for apiCall, keyed by path without the query string. A value is
 * returned as is (an Error is thrown); a function is called with (url, init)
 * and may return, resolve, throw or reject. Unlisted paths get a sensible empty answer.
 */
export function setApi(routes: Record<string, ApiRoute>): void {
  apiRoutes = { ...apiRoutes, ...routes };
}

/** Answers for the page's direct fetch() calls (term sheet, voice token, signed upload). */
export function setFetch(route: FetchRoute): void {
  fetchRoute = route;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** apiCall invocations whose URL starts with the given path, as [url, init]. */
export function apiCallsTo(prefix: string): Array<[string, { method?: string; body?: unknown } | undefined]> {
  return h.apiCall.mock.calls
    .filter((c) => String(c[0]).startsWith(prefix))
    .map((c) => [String(c[0]), c[1] as { method?: string; body?: unknown } | undefined]);
}

export function apiUrls(): string[] {
  return h.apiCall.mock.calls.map((c) => String(c[0]));
}

export function actionCenter(): ActionCenterProps {
  if (!h.actionCenter) throw new Error("ActionCenter has not rendered");
  return h.actionCenter as ActionCenterProps;
}

export function devices(): FakeDevice[] {
  return h.devices as FakeDevice[];
}

/** Path + search the router is on now. */
export function currentLocation(): string {
  return h.location;
}

function LocationProbe(): JSX.Element {
  const loc = useLocation();
  const navigate = useNavigate();
  h.location = loc.pathname + loc.search;
  h.navigate = navigate;
  return null;
}

/** Let the page's fan-out of awaited calls finish. */
export async function settle(rounds = 4): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  }
}

/** Navigate as a client would (a link elsewhere in the app, the address bar). */
export async function goTo(path: string): Promise<void> {
  await act(async () => { (h.navigate as NavigateFunction)(path); });
  await settle();
}

export type RenderPortalOptions = { path?: string; app?: Record<string, unknown> };

export async function renderPortal(opts: RenderPortalOptions = {}): Promise<RenderResult> {
  if (opts.app) h.app = opts.app;
  const result = render(
    <MemoryRouter initialEntries={[opts.path ?? "/application/app-1"]}>
      <Routes>
        <Route path="/application/:id" element={<MiniPortalPage />} />
        <Route path="/portal" element={<MiniPortalPage />} />
        <Route path="*" element={<div data-testid="left-portal" />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
  await settle();
  return result;
}

/** Fire the page's poll the way a returning user does (window focus while visible). */
export async function refocus(): Promise<void> {
  await act(async () => { window.dispatchEvent(new Event("focus")); });
  await settle();
}

beforeEach(() => {
  apiRoutes = {};
  fetchRoute = null;
  h.env.API_BASE = "https://api.test";
  h.token = "tok-123";
  h.native = false;
  h.app = {};
  h.devices.length = 0;
  h.actionCenter = null;
  h.docPicker = null;
  h.feeModal = null;
  h.location = "";
  h.startNewApplication.mockReset();
  h.wipeSession.mockReset();
  h.wipeSession.mockImplementation(async () => undefined);
  h.microphone.mockReset();
  h.microphone.mockImplementation(async () => ({ ok: true, reason: "granted", message: null }));
  h.apiCall.mockReset();
  h.apiCall.mockImplementation(async (url: string, init?: { method?: string; body?: unknown }) => {
    const path = String(url).split("?")[0];
    if (Object.prototype.hasOwnProperty.call(apiRoutes, path)) {
      const route = apiRoutes[path];
      const value = typeof route === "function" ? await (route as (u: string, i?: unknown) => unknown)(url, init) : route;
      if (value instanceof Error) throw value;
      return value;
    }
    return defaultApi(path);
  });
  h.fetch.mockReset();
  h.fetch.mockImplementation(async (url: string, init?: RequestInit) => (fetchRoute ? fetchRoute(String(url), init) : jsonResponse({})));
  vi.stubGlobal("fetch", h.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});
