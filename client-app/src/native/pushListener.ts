import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { parseNativeUrl } from "./deepLinks";

type PushListenerOptions = {
  navigate?: (route: string) => void;
  onRegistrationToken: (token: string) => void | Promise<void>;
  onError: (error: unknown) => void;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// BF_CLIENT_NATIVE_WIRING_v236
// Routes a notification tap or action button. BF-Server v235 sends
// data.url (borealclient://...), data.categoryId and data.applicationId.
// Before this every button did the same thing as a plain tap.
export function routeForPush(actionId: unknown, data: Record<string, unknown> | undefined): string {
  const base = parseNativeUrl(data?.url);
  const rawId = typeof data?.applicationId === "string" ? data.applicationId.trim() : "";
  const appId = UUID.test(rawId) ? rawId : null;
  const action = typeof actionId === "string" ? actionId : "";

  if (action === "UPLOAD_NOW") {
    return appId ? `/application/${appId}?section=documents` : "/portal?section=documents";
  }
  // BF_CLIENT_v802_PUSH_SECTIONS - View offer opens the offers, not just the application.
  if (action === "VIEW_OFFER") {
    return appId ? `/application/${appId}?section=offers` : "/portal?section=offers";
  }
  if (action === "OPEN_APPLICATION") {
    return appId ? `/application/${appId}` : base;
  }
  // Plain tap: keep the section hint but scope it to the right application.
  if (appId && base.startsWith("/portal?section=")) {
    return `/application/${appId}?${base.slice("/portal?".length)}`;
  }
  return base;
}

/** Installs the native push listeners; web starts remain a deliberate no-op. */
export async function installPushListeners(options: PushListenerOptions): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  await PushNotifications.addListener("pushNotificationActionPerformed", ({ actionId, notification }) => {
    options.navigate?.(routeForPush(actionId, notification.data as Record<string, unknown> | undefined));
  });
  await PushNotifications.addListener("registration", ({ value }) => {
    void options.onRegistrationToken(value);
  });
  await PushNotifications.addListener("registrationError", options.onError);

  const current = await PushNotifications.checkPermissions();
  const permission = current.receive === "prompt" ? await PushNotifications.requestPermissions() : current;
  if (permission.receive === "granted") await PushNotifications.register();
  return true;
}

// BF_CLIENT_v789_SIGN_OUT_WIPE - signing out stops push to this device. On a
// phone the APNs/FCM registration is dropped (the next sign-in registers again);
// in a browser every Web Push subscription is cancelled.
export async function unregisterPush(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try { await PushNotifications.removeAllListeners(); } catch { /* plugin unavailable */ }
    try { await PushNotifications.unregister(); } catch { /* not registered */ }
    return;
  }
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const subscription = await registration.pushManager?.getSubscription();
      await subscription?.unsubscribe();
    }
  } catch {
    // No subscription, or push is unsupported here.
  }
}
