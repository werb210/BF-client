import { env } from "@/config/env";

export const ENV = {
  get API_BASE_URL() {
    return `${env.API_URL}/api/v1`;
  },
};
