type Env = {
  API_URL: string;
  JWT_STORAGE_KEY: string;
};

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("Missing VITE_API_URL");
}

export const env: Env = {
  API_URL,
  JWT_STORAGE_KEY: "bf_jwt_token", // must match portal
};
