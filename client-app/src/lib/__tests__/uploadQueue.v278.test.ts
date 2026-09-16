// BF_CLIENT_UPLOAD_QUEUE_v278
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRetryableUploadFailure } from "../uploadQueue";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("which failures are worth retrying later", () => {
  it("retries lost connections, timeouts, rate limits and server errors", () => {
    expect(isRetryableUploadFailure(undefined, new TypeError("Failed to fetch"))).toBe(true);
    expect(isRetryableUploadFailure(undefined, new Error("Load failed"))).toBe(true);
    for (const s of [500, 502, 503, 408, 429]) expect(isRetryableUploadFailure(s)).toBe(true);
  });
  it("does not retry files the server rejected", () => {
    for (const s of [400, 401, 403, 404, 409, 413, 415]) expect(isRetryableUploadFailure(s)).toBe(false);
  });
});

describe("queue behaviour", () => {
  const queue = read("lib/uploadQueue.ts");
  it("no longer counts offline time as failed attempts", () => {
    expect(queue).toContain("if (typeof st !== \"number\" && isRetryableUploadFailure(undefined, err)) continue;");
    expect(Number(queue.match(/const\s+MAX_ATTEMPTS\s*=\s*(\d+)/)![1])).toBeGreaterThanOrEqual(10);
  });
  it("sends signed-in mini-portal uploads with the session and keeps them through a 401", () => {
    expect(queue).toContain('if (item.mode === "session")');
    expect(queue).toContain("/api/client/documents/upload");
    expect(queue).toContain('!(st === 401 && item.mode === "session")');
  });
  it("drains when the app comes back to the foreground", () => {
    const watcher = read("state/uploadQueueWatcher.ts");
    expect(watcher).toContain('addEventListener("boreal:native-resume"');
    expect(watcher).toContain("visibilitychange");
  });
});

describe("mini-portal Upload Now", () => {
  const picker = read("components/DocPicker.tsx");
  it("saves files to the queue instead of losing them when the connection drops", () => {
    expect(picker).toContain('enqueueUploadFromFile({ applicationToken: "", applicationId, documentType, file, mode: "session" })');
    expect(picker).toContain('data-testid="docpicker-queued-notice"');
  });
  it("still uploads every selected file", () => {
    expect(picker).toContain("for (const file of files)");
  });
});
