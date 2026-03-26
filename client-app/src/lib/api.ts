export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://server.boreal.financial";

export { apiFetch, apiRequest, buildUrl } from "./apiFetch";
