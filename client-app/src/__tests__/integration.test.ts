test("client must reach server", async () => {
  const res = await fetch(`${process.env.VITE_API_URL || "http://localhost:8080"}/health`);
  expect(res.status).toBe(200);
});
