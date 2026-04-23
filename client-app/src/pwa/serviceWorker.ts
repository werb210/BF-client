type ServiceWorkerMessage =
  | { type: "CLEAR_CACHES" }
  | { type: "AUTH_REFRESH" }
  | { type: "SKIP_WAITING" };

type UpdateListener = (available: boolean) => void;

const UPDATE_RELOAD_KEY = "boreal_sw_update_reloaded";
let updateAvailable = false;
let pendingReload = false;
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;
const updateListeners = new Set<UpdateListener>();

function notifyUpdateAvailable(next: boolean) {
  if (updateAvailable === next) return;
  updateAvailable = next;
  updateListeners.forEach((listener) => listener(updateAvailable));
  if (next && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sw:update-available"));
  }
}

function shouldReloadForUpdate() {
  try {
    return window.sessionStorage.getItem(UPDATE_RELOAD_KEY) !== "true";
  } catch {
    return true;
  }
}

function markReloaded() {
  try {
    window.sessionStorage.setItem(UPDATE_RELOAD_KEY, "true");
  } catch {
  }
}

function clearReloadMarker() {
  try {
    window.sessionStorage.removeItem(UPDATE_RELOAD_KEY);
  } catch {
  }
}

export function subscribeToServiceWorkerUpdates(listener: UpdateListener) {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

export function getServiceWorkerUpdateAvailable() {
  return updateAvailable;
}

export function __resetServiceWorkerStateForTests() {
  updateAvailable = false;
  pendingReload = false;
  registrationPromise = null;
  updateListeners.clear();
}

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (registrationPromise) return;

  clearReloadMarker();

  registrationPromise = new Promise((resolve) => {
    const register = async () => {
      try {
        // Actually create the registration — getRegistration() only retrieves an existing one.
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (registration?.waiting) {
          notifyUpdateAvailable(true);
        }
        registration?.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              notifyUpdateAvailable(true);
            }
          });
        });
        resolve(registration ?? null);
      } catch {
        resolve(null);
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener(
        "load",
        () => {
          void register();
        },
        { once: true }
      );
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!pendingReload) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && document.visibilityState !== "visible") {
      pendingReload = false;
      return;
    }
    if (!shouldReloadForUpdate()) {
      pendingReload = false;
      return;
    }
    pendingReload = false;
    markReloaded();
    window.location.reload();
  });
}

async function postMessage(message: ServiceWorkerMessage) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage(message);
}

export async function clearServiceWorkerCaches(reason: "logout" | "otp") {
  const message: ServiceWorkerMessage =
    reason === "otp" ? { type: "AUTH_REFRESH" } : { type: "CLEAR_CACHES" };
  await postMessage(message);
}

export async function applyServiceWorkerUpdate() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  pendingReload = true;
  const registration = await navigator.serviceWorker.ready;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
