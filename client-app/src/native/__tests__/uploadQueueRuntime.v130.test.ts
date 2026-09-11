import { describe, expect, it, vi } from "vitest";
import {
  createTransport,
  DISCOVERED_UPLOAD_ROUTE,
  resolveRoute,
  UploadHttpError,
} from "../uploadQueueRuntime";
import type { UploadItem } from "../uploadQueue";

const item: UploadItem = {
  id: "u1",
  applicationId: "app-7",
  documentType: "bank_statement",
  fileName: "march.pdf",
  fileRef: "file:///tmp/march.pdf",
  bytes: 10,
  status: "pending",
  attempts: 0,
  lastError: "",
  createdAt: 0,
  updatedAt: 0,
};

describe("v130 upload queue runtime", () => {
  it("exports the route discovered from the codebase", () => {
    expect(DISCOVERED_UPLOAD_ROUTE).toBe("/api/client/documents/upload");
  });

  it("substitutes and escapes application id placeholders", () => {
    expect(resolveRoute("/api/applications/:applicationId/documents", item)).toBe(
      "/api/applications/app-7/documents",
    );
    expect(resolveRoute("/api/applications/{applicationId}/documents", item)).toBe(
      "/api/applications/app-7/documents",
    );
    expect(resolveRoute("/api/applications/:id/documents", item)).toBe(
      "/api/applications/app-7/documents",
    );
    expect(resolveRoute("/api/a/:applicationId", { ...item, applicationId: "a/b" })).toBe("/api/a/a%2Fb");
  });

  it("posts multipart with the bearer token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    const transport = createTransport({
      baseUrl: "https://server.boreal.financial/",
      route: "/api/applications/:applicationId/documents",
      getToken: () => "tok123",
      readFile: async () => new Blob(["x"]),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await transport.upload(item);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const call = fetchImpl.mock.calls[0];
    expect(call?.[0]).toBe("https://server.boreal.financial/api/applications/app-7/documents");
    expect(call?.[1]?.method).toBe("POST");
    expect(call?.[1]?.headers?.Authorization).toBe("Bearer tok123");
    expect(call?.[1]?.body).toBeInstanceOf(FormData);
  });

  it("omits the auth header when there is no token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    const transport = createTransport({
      baseUrl: "https://x.ca",
      route: "/api/u",
      getToken: () => null,
      readFile: async () => new Blob(["x"]),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await transport.upload(item);
    expect(fetchImpl.mock.calls[0]?.[1]?.headers?.Authorization).toBeUndefined();
  });

  it("throws an UploadHttpError carrying the response status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable",
      text: async () => "wrong document type",
    });
    const transport = createTransport({
      baseUrl: "https://x.ca",
      route: "/api/u",
      getToken: () => "t",
      readFile: async () => new Blob(["x"]),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(transport.upload(item)).rejects.toBeInstanceOf(UploadHttpError);
    await expect(transport.upload(item)).rejects.toMatchObject({ status: 422 });
  });

  it("propagates a file read failure", async () => {
    const transport = createTransport({
      baseUrl: "https://x.ca",
      route: "/api/u",
      getToken: () => "t",
      readFile: async () => {
        throw new Error("file gone");
      },
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    await expect(transport.upload(item)).rejects.toThrow("file gone");
  });
});
