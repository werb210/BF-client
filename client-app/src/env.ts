export const ENV = {
  API_BASE: import.meta.env.VITE_API_BASE || "https://server.boreal.financial",
  API_VERSION: import.meta.env.VITE_API_VERSION || "v1",
};

console.log("ENV FILE LOADED - NEW VERSION");

export function validateEnv() {
  // DO NOTHING — NEVER THROW
  console.log("ENV (safe):", ENV);
}
