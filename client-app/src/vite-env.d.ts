/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly MODE: string;
  readonly PROD: boolean;
  readonly SSR: boolean;
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
