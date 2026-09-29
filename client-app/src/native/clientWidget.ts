// BF_CLIENT_BLOCK_v590_HOME_WIDGET
// Feeds the iPhone/iPad home-screen widget: application stage, business name and the
// "What you need to do" count. Native iOS and Android only; a no-op everywhere else.
import { Capacitor, registerPlugin } from "@capacitor/core";

export type ClientWidgetUpdate = { applicationId?: string | null; stage?: string | null; todo?: unknown; business?: string | null; action?: string | null };

// BF_CLIENT_WIDGET_BRAND_v631 - the widget's action line, in plain words: what the client
// actually has to do next ("Upload 2 documents", "Fill in 1 form"), or "Nothing to do".
export function actionLine(items: Array<{ kind?: string }> | null | undefined): string {
  const list = Array.isArray(items) ? items : [];
  const docs = list.filter((i) => i?.kind === "document").length;
  const forms = list.filter((i) => i?.kind === "form").length;
  const steps = list.length - docs - forms; // BF_CLIENT_TODO_ACTIONS_v637 - signing, PGI
  const parts: string[] = [];
  if (docs > 0) parts.push(docs === 1 ? "Upload 1 document" : "Upload " + docs + " documents");
  if (forms > 0) parts.push(forms === 1 ? "Fill in 1 form" : "Fill in " + forms + " forms");
  if (steps > 0) parts.push(steps === 1 ? "Complete 1 step" : "Complete " + steps + " steps");
  return parts.length ? parts.join(" · ") : "Nothing to do";
}
interface ClientWidgetPlugin {
  update(options: { applicationId?: string; stage?: string; todo?: number; business?: string; action?: string; token?: string; apiBase?: string }): Promise<void>;
  clear(): Promise<void>;
}
const ClientWidget = registerPlugin<ClientWidgetPlugin>("ClientWidget");

export function widgetPayload(u: ClientWidgetUpdate): { applicationId?: string; stage?: string; todo?: number; business?: string; action?: string } {
  const out: { applicationId?: string; stage?: string; todo?: number; business?: string; action?: string } = {};
  const action = String(u.action ?? "").trim();
  if (action) out.action = action.slice(0, 60);
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
  // BF_CLIENT_WIDGET_SELF_REFRESH_v675 - the sign-in token and server address let the widget refresh itself.
  const payload: Parameters<ClientWidgetPlugin["update"]>[0] = { ...widgetPayload(u) };
  try {
    const { getToken } = await import("@/auth/token");
    const { ENV } = await import("@/env");
    const token = getToken();
    if (token) payload.token = token;
    const base = String(ENV.API_BASE || "").replace(/[/]+$/, "");
    if (base) payload.apiBase = base;
  } catch { /* the widget still shows the app's last snapshot */ }
  await ClientWidget.update(payload).catch((): void => undefined);
}

export async function clearClientWidget(): Promise<void> {
  if (!available()) return;
  await ClientWidget.clear().catch((): void => undefined);
}
