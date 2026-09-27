// BF_CLIENT_BLOCK_v590_HOME_WIDGET
// Feeds the iPhone/iPad home-screen widget: application stage, business name and the
// "What you need to do" count. Native iOS and Android only; a no-op everywhere else.
import { Capacitor, registerPlugin } from "@capacitor/core";

export type ClientWidgetUpdate = { applicationId?: string | null; stage?: string | null; todo?: unknown; business?: string | null };
interface ClientWidgetPlugin {
  update(options: { applicationId?: string; stage?: string; todo?: number; business?: string }): Promise<void>;
  clear(): Promise<void>;
}
const ClientWidget = registerPlugin<ClientWidgetPlugin>("ClientWidget");

export function widgetPayload(u: ClientWidgetUpdate): { applicationId?: string; stage?: string; todo?: number; business?: string } {
  const out: { applicationId?: string; stage?: string; todo?: number; business?: string } = {};
  const id = String(u.applicationId ?? "").trim();
  if (id) out.applicationId = id;
  const stage = String(u.stage ?? "").trim();
  if (stage) out.stage = stage;
  const business = String(u.business ?? "").trim();
  if (business && business !== "undefined" && business !== "null") out.business = business.slice(0, 80);
  if (u.todo !== undefined && u.todo !== null) {
    const n = Math.floor(Number(u.todo));
    if (Number.isFinite(n)) out.todo = Math.max(0, Math.min(n, 99));
  }
  return out;
}

// BF_CLIENT_BLOCK_v591_ANDROID_WIDGET - iOS (v590) and Android.
const available = (): boolean => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("ClientWidget");

export async function updateClientWidget(u: ClientWidgetUpdate): Promise<void> {
  if (!available()) return;
  await ClientWidget.update(widgetPayload(u)).catch((): void => undefined);
}

export async function clearClientWidget(): Promise<void> {
  if (!available()) return;
  await ClientWidget.clear().catch((): void => undefined);
}
