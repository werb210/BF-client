const apiUrl = process.env.VITE_API_URL;
const shouldRun = !!apiUrl && apiUrl !== "http://localhost:8080";

(shouldRun ? test : test.skip)("backend reachable", async () => {
  const res = await fetch(`${apiUrl}/health`);
  expect(res.status).toBe(200);
});
