export type AppMode = 'development' | 'test' | 'production'

export function getMode(): AppMode {
  return import.meta.env.MODE as AppMode
}

export const isDevMode = (): boolean => getMode() === 'development'
export const isTestMode = (): boolean => getMode() === 'test'

function requireApiUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL
  if (!apiUrl) {
    throw new Error('Missing VITE_API_URL')
  }
  return apiUrl
}

export function validateEnv() {
  return {
    mode: getMode(),
    apiUrl: requireApiUrl(),
  }
}

export const env = {
  API_URL: requireApiUrl(),
}
