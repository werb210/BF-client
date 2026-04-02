if (!import.meta.env.VITE_API_URL) {
  (import.meta as any).env = {
    ...import.meta.env,
    VITE_API_URL: 'http://localhost:3000',
    MODE: 'test',
  };
}
