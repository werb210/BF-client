import { getEnv } from "@/config/env";

export const ENV = {
  get API_BASE_URL() {
    const { VITE_API_URL } = getEnv();
    return `${VITE_API_URL}/api/v1`;
  },
};
