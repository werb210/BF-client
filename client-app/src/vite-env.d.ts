/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  dataLayer?: Array<Record<string, any>>;
  gtag?: (command: string, eventName: string, payload?: Record<string, any>) => void;
  clarity?: (command: string, key: string, value?: Record<string, any>) => void;
  grecaptcha?: { execute: () => Promise<string> };
  __APP_CONTINUATION__?: {
    applicationId: string;
    step: number;
    data: Record<string, any>;
  };
  __APP_CONTINUATION_ERROR__?: string;
  __ENV?: {
    API_BASE?: string;
  };
}
