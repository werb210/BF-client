import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  __resetServiceWorkerStateForTests,
  applyServiceWorkerUpdate,
  getServiceWorkerUpdateAvailable,
  registerServiceWorker,
} from "../serviceWorker";

describe("service worker updates", () => {
  beforeEach(() => {
    __resetServiceWorkerStateForTests();
    const listeners: Record<string, Array<(event: Event) => void>> = {};
    Object.defineProperty(globalThis, "CustomEvent", {
      value: class CustomEvent {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: {
        location: { reload: vi.fn() },
        sessionStorage: {
          getItem: vi.fn().mockReturnValue(null),
          setItem: vi.fn(),
          removeItem: vi.fn(),
        },
        addEventListener: (event: string, cb: (event: Event) => void) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(cb);
        },
        dispatchEvent: (event: Event) => {
          listeners[event.type]?.forEach((cb) => cb(event));
          return true;
        },
      },
      configurable: true,
    });
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
    });
    Object.defineProperty(globalThis, "document", {
      value: {
        readyState: "loading",
        visibilityState: "visible",
      },
      configurable: true,
    });
  });

  it("surfaces update availability when a new worker installs", async () => {
    const updateListeners: Record<string, () => void> = {};
    const workerListeners: Record<string, () => void> = {};
    const worker = {
      state: "installing",
      addEventListener: (event: string, cb: () => void) => {
        workerListeners[event] = cb;
      },
    };
    const registration = {
      waiting: {},
      installing: worker,
      addEventListener: (event: string, cb: () => void) => {
        updateListeners[event] = cb;
      },
    };

    const controllerChangeListeners: Record<string, () => void> = {};

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue(registration),
        addEventListener: (event: string, cb: () => void) => {
          controllerChangeListeners[event] = cb;
        },
        controller: {},
      },
      configurable: true,
    });

    registerServiceWorker();
    window.dispatchEvent(new Event("load"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    updateListeners.updatefound?.();
    worker.state = "installed";
    workerListeners.statechange?.();

    expect(getServiceWorkerUpdateAvailable()).toBe(true);
  });

  it("requests skip waiting when applying updates", async () => {
    const waitingWorker = { postMessage: vi.fn() };
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({ waiting: waitingWorker }),
      },
      configurable: true,
    });

    await applyServiceWorkerUpdate();

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("reloads once when the controller changes after an update", async () => {
    const waitingWorker = { postMessage: vi.fn() };
    const controllerChangeListeners: Record<string, () => void> = {};

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({ waiting: waitingWorker }),
        addEventListener: (event: string, cb: () => void) => {
          controllerChangeListeners[event] = cb;
        },
      },
      configurable: true,
    });

    registerServiceWorker();
    await applyServiceWorkerUpdate();

    controllerChangeListeners["controllerchange"]?.();

    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      "boreal_sw_update_reloaded",
      "true"
    );
  });
});
