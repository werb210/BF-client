// BF_CLIENT_BACKGROUND_UPLOAD_v307
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const plugin = vi.hoisted(() => ({ enqueue: vi.fn(async () => undefined), results: vi.fn(), acknowledge: vi.fn(async () => undefined), cancelAll: vi.fn(async () => undefined) }));
const queue = vi.hoisted(() => ({ items: [] as any[] }));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true }, registerPlugin: () => plugin }));
vi.mock("@/env", () => ({ ENV: { API_BASE: "https://server.boreal.financial" } }));
vi.mock("@/auth/token", () => ({ getToken: () => "jwt-1" }));
vi.mock("@/lib/uploadQueue", () => ({
  listQueuedUploads: async () => queue.items.map((item) => ({ ...item })),
  updateQueuedUpload: async (item: any) => { queue.items = queue.items.map((existing) => (existing.id === item.id ? item : existing)); },
  removeQueuedUpload: async (id: number) => { queue.items = queue.items.filter((item) => item.id !== id); },
}));

import { handOffQueuedUploads, outcomeFor, reconcileBackgroundUploads, requestFor } from "../backgroundUpload";

const item = (overrides: any = {}) => ({ id: 7, applicationToken: "tok", applicationId: "app-1", documentType: "bank_statements", filename: "june.pdf", contentType: "application/pdf", base64: "AAAA", enqueuedAt: 1, attempts: 0, mode: "session", ...overrides });

beforeEach(() => { queue.items = []; plugin.enqueue.mockClear(); plugin.results.mockReset(); plugin.acknowledge.mockClear(); });

describe("background uploads", () => {
  it("builds equivalent session and public upload requests", () => {
    const session = requestFor(item() as any, "jwt-1", "https://s");
    expect(session.url).toBe("https://s/api/client/documents/upload");
    expect(session.headers).toEqual({ "X-Background-Upload": "1", Authorization: "Bearer jwt-1" });
    expect(session.fields).toEqual({ category: "bank_statements", document_type: "bank_statements", applicationId: "app-1" });
    const publicRequest = requestFor(item({ mode: "public" }) as any, null, "https://s");
    expect(publicRequest.url).toBe("https://s/api/documents/public-upload");
    expect(publicRequest.fields.application_token).toBe("tok");
    expect(publicRequest.headers.Authorization).toBeUndefined();
  });

  it("classifies native upload outcomes", () => {
    expect(outcomeFor(200, "session")).toBe("done");
    expect(outcomeFor(409, "public")).toBe("done");
    expect(outcomeFor(401, "session")).toBe("retry");
    expect(outcomeFor(415, "public")).toBe("drop");
    expect(outcomeFor(0, "public")).toBe("retry");
    expect(outcomeFor(503, "session")).toBe("retry");
  });

  it("hands each queued upload to the phone once", async () => {
    queue.items = [item(), item({ id: 8, backgroundHandedAt: 123 })];
    expect(await handOffQueuedUploads()).toBe(1);
    expect(plugin.enqueue).toHaveBeenCalledWith(expect.objectContaining({ id: "bf-upload-7", fileName: "june.pdf", fileBase64: "AAAA" }));
    expect(queue.items[0].backgroundHandedAt).toBeTruthy();
  });

  it("clears completed uploads and returns failures to the web retry", async () => {
    queue.items = [item({ backgroundHandedAt: 1 }), item({ id: 8, backgroundHandedAt: 1 })];
    plugin.results.mockResolvedValue({ results: [{ id: "bf-upload-7", status: 201 }, { id: "bf-upload-8", status: 0, error: "offline" }] });
    expect(await reconcileBackgroundUploads()).toEqual({ done: 1, dropped: 0, retry: 1 });
    expect(queue.items.map((queuedItem) => queuedItem.id)).toEqual([8]);
    expect(queue.items[0].backgroundHandedAt).toBeUndefined();
    expect(plugin.acknowledge).toHaveBeenCalledWith({ ids: ["bf-upload-7", "bf-upload-8"] });
  });

  it("wires lifecycle, sign-out, queue, and both native implementations", () => {
    const src = join(__dirname, "..", "..");
    const read = (path: string) => readFileSync(join(src, path), "utf8");
    expect(read("native/useNativeRuntime.ts")).toContain('new Event("boreal:native-pause")');
    expect(read("state/uploadQueueWatcher.ts")).toContain("reconcileBackgroundUploads()");
    expect(read("lib/uploadQueue.ts")).toContain("if (item.backgroundHandedAt) continue;");
    expect(read("auth/logout.ts")).toContain("cancelBackgroundUploads()");
    const root = join(src, "..");
    expect(readFileSync(join(root, "ios/App/App/AppDelegate.swift"), "utf8")).toContain("handleEventsForBackgroundURLSession");
    expect(readFileSync(join(root, "ios/App/App/BorealBridgeViewController.swift"), "utf8")).toContain("registerPluginInstance(BackgroundUploadPlugin())");
    expect(readFileSync(join(root, "android/app/src/main/java/com/boreal/client/MainActivity.java"), "utf8")).toContain("registerPlugin(BackgroundUploadPlugin.class)");
    expect(readFileSync(join(root, "android/app/build.gradle"), "utf8")).toContain("androidx.work:work-runtime");
  });
});
