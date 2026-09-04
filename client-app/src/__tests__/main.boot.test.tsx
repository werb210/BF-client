import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hydrateToken: vi.fn(),
  render: vi.fn(),
  startJourney: vi.fn(),
  captureAttribution: vi.fn(),
  initClarity: vi.fn(),
  startPendingSubmitWatcher: vi.fn(),
  startUploadQueueWatcher: vi.fn(),
  startFormResponseQueueWatcher: vi.fn(),
  validateBootToken: vi.fn(),
  registerClientSW: vi.fn(),
}));

vi.mock("react-dom/client", () => ({
  default: { createRoot: () => ({ render: mocks.render }) },
}));
vi.mock("../App", () => ({ default: (): null => null }));
vi.mock("../components/RouteTracker", () => ({ default: (): null => null }));
vi.mock("../components/ConsentBanner", () => ({ default: (): null => null }));
vi.mock("../env", () => ({ validateEnv: vi.fn() }));
vi.mock("../auth/token", () => ({ hydrateToken: mocks.hydrateToken }));
vi.mock("../lib/journey", () => ({ startJourney: mocks.startJourney }));
vi.mock("../lib/attribution", () => ({ captureAttribution: mocks.captureAttribution }));
vi.mock("../lib/clarity", () => ({ initClarity: mocks.initClarity }));
vi.mock("../state/pendingSubmit", () => ({ startPendingSubmitWatcher: mocks.startPendingSubmitWatcher }));
vi.mock("../state/uploadQueueWatcher", () => ({ startUploadQueueWatcher: mocks.startUploadQueueWatcher }));
vi.mock("../state/formResponseQueueWatcher", () => ({ startFormResponseQueueWatcher: mocks.startFormResponseQueueWatcher }));
vi.mock("../state/validateBootToken", () => ({ validateBootToken: mocks.validateBootToken }));
vi.mock("../pwa/registerSW", () => ({ registerClientSW: mocks.registerClientSW }));

async function loadApplication(): Promise<void> {
  vi.resetModules();
  await import("../main");
  await vi.waitFor(() => expect(mocks.render).toHaveBeenCalledOnce());
}

describe("application boot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
    mocks.hydrateToken.mockResolvedValue(undefined);
  });

  it("continues boot and renders after secure credential hydration succeeds", async () => {
    await loadApplication();

    expect(mocks.hydrateToken).toHaveBeenCalledOnce();
    expect(mocks.startJourney).toHaveBeenCalledOnce();
    expect(mocks.render).toHaveBeenCalledOnce();
    expect(mocks.registerClientSW).toHaveBeenCalledOnce();
  });

  it("renders unauthenticated when secure credential hydration rejects without logging a token", async () => {
    const credentialValue = "secret-jwt-value";
    const failure = new Error("native plugin unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.hydrateToken.mockRejectedValueOnce(failure);

    await loadApplication();

    expect(mocks.render).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "Native credential hydration failed; continuing unauthenticated",
      failure
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(credentialValue);
    consoleError.mockRestore();
  });
});
