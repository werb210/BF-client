import { API_URL } from "../config";

export const API_BASE = `${API_URL}/api/v1`;

if (!API_BASE.includes("/api/v1")) {
  throw new Error("INVALID_API_BASE");
}
