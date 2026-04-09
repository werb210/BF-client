type EnvConfig = {
  API_BASE_URL: string;
  API_VERSION: string;
};

function getEnv(): EnvConfig {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "https://server.boreal.financial";

  const API_VERSION =
    import.meta.env.VITE_API_VERSION ||
    "v1";

  // ONLY enforce strict validation in DEV
  if (import.meta.env.DEV) {
    if (!API_BASE_URL) {
      throw new Error("Missing VITE_API_BASE_URL");
    }

    if (!API_VERSION) {
      throw new Error("Missing VITE_API_VERSION");
    }
  }

  return {
    API_BASE_URL,
    API_VERSION,
  };
}

export const ENV = getEnv();
