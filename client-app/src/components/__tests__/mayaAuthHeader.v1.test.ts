import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const src = readFileSync(fileURLToPath(new URL("../MayaWidget.tsx", import.meta.url)), "utf-8");

describe("Maya call carries the signed-in token", () => {
  it("imports getToken and attaches a Bearer token to the maya request", () => {
    expect(src).toContain('import { getToken } from "@/auth/token"');
    expect(src).toContain("Authorization: `Bearer ${getToken()}`");
  });
});
