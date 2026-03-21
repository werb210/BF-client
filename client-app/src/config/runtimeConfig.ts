// src/config/runtimeConfig.ts

type RuntimeConfig = {
  API_BASE: string;
};

function getEnv(name: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[name];
  }
  return undefined;
}

function required(name: string, value?: string): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const isTest =
  typeof process !== 'undefined' &&
  process.env &&
  process.env.NODE_ENV === 'test';

// In test, allow fallback to avoid crashes
const API_BASE = isTest
  ? getEnv('VITE_API_URL') || 'http://localhost:3000'
  : required('VITE_API_URL', getEnv('VITE_API_URL'));

export const runtimeConfig: RuntimeConfig = {
  API_BASE,
};
