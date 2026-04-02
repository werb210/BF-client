import { getMode } from "@/config/env";

export const buildInfo = {
  mode: getMode(),
  timestamp: new Date().toISOString(),
};
