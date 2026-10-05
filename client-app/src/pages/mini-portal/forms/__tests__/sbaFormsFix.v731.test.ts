// BF_CLIENT_SBA_FORMS_FIX_v731
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/env", () => ({ ENV: { API_BASE: "https://server.boreal.financial/" } }));
import { serverUrl } from "../Stage2Page";

describe("SBA Forms page talks to the server", () => {
  it("builds absolute server addresses", () => {
    expect(serverUrl("/api/client/documents-needed/needed?applicationId=x")).toBe("https://server.boreal.financial/api/client/documents-needed/needed?applicationId=x");
  });
  it("no relative /api fetches remain on the page, and both calls send the sign-in token", () => {
    const s = readFileSync("src/pages/mini-portal/forms/Stage2Page.tsx", "utf8");
    expect(s).not.toMatch(/fetch\(\s*[`"']\/api\//);
    expect((s.match(/headers: authHeaders\(\)/g) ?? []).length).toBe(2);
  });
});
