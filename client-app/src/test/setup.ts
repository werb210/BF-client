import { afterAll, afterEach, vi } from "vitest";

process.env.VITE_API_URL = process.env.VITE_API_URL || "http://localhost:3000";

afterEach(() => {
  // keep deterministic test isolation
});

afterAll(() => {
  vi.restoreAllMocks();
});
