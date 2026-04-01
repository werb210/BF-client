import { expect, test } from "vitest";

const hasApiUrl = Boolean(process.env.VITE_API_URL);
const integrationTest = hasApiUrl ? test : test.skip;

integrationTest("backend reachable", async () => {
  const res = await fetch(`${process.env.VITE_API_URL}/health`);
  expect(res.status).toBe(200);
});
