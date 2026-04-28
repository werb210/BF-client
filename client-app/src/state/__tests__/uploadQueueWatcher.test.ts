// BF_UPLOAD_QUEUE_v51 — file-content contract tests. Browser-API-free so the
// suite runs in any node environment.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const queueFile   = fs.readFileSync(path.resolve(__dirname, "../../lib/uploadQueue.ts"), "utf8");
const watcherFile = fs.readFileSync(path.resolve(__dirname, "../uploadQueueWatcher.ts"), "utf8");
const mainFile    = fs.readFileSync(path.resolve(__dirname, "../../main.tsx"), "utf8");
const stepFile    = fs.readFileSync(path.resolve(__dirname, "../../wizard/Step5_Documents.tsx"), "utf8");

describe("BF_UPLOAD_QUEUE_v51 uploadQueue", () => {
  it("stores a JSON-serializable descriptor (not a FormData)", () => {
    expect(queueFile).toContain("QueuedUploadDescriptor");
    expect(queueFile).toContain("base64");
    expect(queueFile).not.toContain("formData: FormData");
  });
  it("exports enqueueUploadFromFile, processQueue, queueLength", () => {
    expect(queueFile).toContain("export async function enqueueUploadFromFile");
    expect(queueFile).toContain("export async function processQueue");
    expect(queueFile).toContain("export async function queueLength");
  });
  it("guards against offline before draining", () => {
    expect(queueFile).toMatch(/navigator\.onLine\s*===\s*false/);
  });
});

describe("BF_UPLOAD_QUEUE_v51 watcher", () => {
  it("drains on boot, online, and interval", () => {
    expect(watcherFile).toContain('addEventListener("online"');
    expect(watcherFile).toMatch(/setInterval\(/);
    expect(watcherFile).toContain("processQueue");
  });
});

describe("BF_UPLOAD_QUEUE_v51 wiring", () => {
  it("main.tsx starts the watcher", () => {
    expect(mainFile).toContain("startUploadQueueWatcher");
  });
  it("Step5_Documents enqueues on final failure", () => {
    expect(stepFile).toContain("enqueueUploadFromFile");
    expect(stepFile).toContain("BF_UPLOAD_QUEUE_v51");
  });
});
