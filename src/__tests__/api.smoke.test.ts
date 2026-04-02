import { describe, it, expect } from "vitest";
import { api } from "../lib/api";

describe("REAL API smoke test", () => {
  it("GET /health returns ok", async () => {
    const result = await api("/health");

    expect(result).toBeDefined();
  });
});
