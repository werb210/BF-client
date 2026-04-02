export type Env = {
  API_URL: string;
  JWT_STORAGE_KEY: string;
};

function getEnv(): Env {
  if (!import.meta.env.VITE_API_URL) {
    throw new Error("Missing VITE_API_URL");
  }

  return {
    API_URL: import.meta.env.VITE_API_URL,
    JWT_STORAGE_KEY: "bf_jwt_token",
  };
}

export const env = getEnv();
