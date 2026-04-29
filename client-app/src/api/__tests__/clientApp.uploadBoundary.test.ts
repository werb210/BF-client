// BF_CLIENT_UPLOAD_BOUNDARY_v62 — guard against a regression where someone
// manually sets Content-Type: "multipart/form-data" alongside a FormData body.
// That breaks every document upload because the boundary suffix is not
// included; multer on the server rejects with "Multipart: Boundary not found"
// and the request returns 500. The retry queue then re-fails forever.
//
// Source-text lint (matches the pattern of Step6.imports.test.ts and
// Step6.pgiOrder.test.ts): scans the client API surface for the exact
// header pattern that caused the bug, and asserts no occurrences.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("BF_CLIENT_UPLOAD_BOUNDARY_v62 — multipart Content-Type guard", () => {
  it("clientApp.ts does not manually set Content-Type for FormData uploads", () => {
    const src = readFileSync(join(__dirname, "../clientApp.ts"), "utf8");

    // The bug pattern: setting Content-Type to plain "multipart/form-data"
    // without a boundary. fetch/axios will not auto-add the boundary if you
    // explicitly set Content-Type. Reject any header object literal that
    // hardcodes this string.
    const badPattern = /["\']Content-Type["\']\s*:\s*["\']multipart\/form-data["\']/;
    expect(src).not.toMatch(badPattern);
  });

  it("documents the v62 fix anchor", () => {
    const src = readFileSync(join(__dirname, "../clientApp.ts"), "utf8");
    expect(src).toContain("BF_CLIENT_UPLOAD_BOUNDARY_v62");
  });

  it("uploadDocument still passes onUploadProgress through to the request", () => {
    // Defensive: removing the headers object should NOT have removed
    // onUploadProgress (which is in the same options block).
    const src = readFileSync(join(__dirname, "../clientApp.ts"), "utf8");
    expect(src).toContain("onUploadProgress");
    // And the upload still calls api.post with formData as the body.
    expect(src).toMatch(/api\.post<[^>]*>\(\s*DOCUMENT_CONTRACT\.UPLOAD\s*,\s*formData/);
  });
});

// BF_CLIENT_UPLOAD_BOUNDARY_v62_TEST_ANCHOR
