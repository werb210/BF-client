export type AppMode = 'development' | 'test' | 'production'

export function getMode(): AppMode {
  return import.meta.env.MODE as AppMode
}

export const isDevMode = (): boolean => getMode() === 'development'
export const isTestMode = (): boolean => getMode() === 'test'

export function validateEnv() {
  // Minimal safe validation (expand later)
  return {
    mode: getMode(),
    apiUrl: import.meta.env.VITE_API_URL || '',
  }
}

export const env = {
  API_URL: import.meta.env.VITE_API_URL || '',
}
