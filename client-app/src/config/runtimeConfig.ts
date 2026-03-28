import { API_BASE_URL } from './api';

type RuntimeConfig = {
  API_BASE: string;
};

export const runtimeConfig: RuntimeConfig = {
  API_BASE: API_BASE_URL,
};
