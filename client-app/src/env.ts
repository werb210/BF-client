export const ENV = {
  get API_BASE_URL() {
    const base = import.meta.env.VITE_API_URL;
    if (!base) {
      throw new Error("VITE_API_URL missing");
    }
    return `${base}/api/v1`;
  },
};
