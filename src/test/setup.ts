import { vi } from 'vitest';

// Prevent real network calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: {} }),
  } as Response)
);

// Fix act() warnings (React 18)
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

process.setMaxListeners(20);

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    register: vi.fn(),
  },
});
