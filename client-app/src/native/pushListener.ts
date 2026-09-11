import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { parseNativeUrl } from "./deepLinks";

type PushListenerOptions = {
  navigate?: (route: string) => void;
  onRegistrationToken: (token: string) => void | Promise<void>;
  onError: (error: unknown) => void;
};

/** Installs the native push listeners; web starts remain a deliberate no-op. */
export async function installPushListeners(options: PushListenerOptions): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    options.navigate?.(parseNativeUrl(notification.data?.url));
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
