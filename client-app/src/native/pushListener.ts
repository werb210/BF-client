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
  if (action === "OPEN_APPLICATION" || action === "VIEW_OFFER") {
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
