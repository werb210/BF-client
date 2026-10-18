// BF_CLIENT_v823_LIVE_ACTIVITY
// The application's stage on the phone's lock screen:
//   iPhone  - a Live Activity / Dynamic Island (ApplicationStatusPlugin in AppDelegate.swift, drawn by ClientWidget)
//   Android - a quiet status notification (ApplicationStatusPlugin.java)
// The app refreshes it whenever it reads the stage; BF-Server v823 pushes stage changes while the app is closed. The
// iPhone reports its own Live Activity tokens to the server; Android just needs to be registered once per file.
// The words match BF-Server's applicationStatusLive.ts so a pushed update and an app refresh read the same.
import { Capacitor, registerPlugin } from "@capacitor/core";

export const STATUS_STEPS = [
  { key: "received", label: "Received" },
  { key: "in_review", label: "In Review" },
  { key: "documents_required", label: "Documents Required" },
  { key: "additional_steps_required", label: "Additional Steps" },
  { key: "off_to_lender", label: "Off to Lender" },
  { key: "offer", label: "Offer" },
  { key: "funded", label: "Funded" },
] as const;

export type StatusContent = { stage: string; step: number; totalSteps: number; action: string; final: boolean };

export function statusContent(pipelineState: unknown): StatusContent {
  const raw = String(pipelineState ?? "").trim();
  const totalSteps = STATUS_STEPS.length;
  if (/^(accepted|funded)$/i.test(raw)) return { stage: "Funded", step: totalSteps, totalSteps, action: "Your funding is complete.", final: true };
  if (/^(declined|rejected|closed|withdrawn|lost|cancelled|canceled)$/i.test(raw)) {
    return { stage: "Closed", step: totalSteps, totalSteps, action: "Open the app for details.", final: true };
  }
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
  const index = STATUS_STEPS.findIndex((step) => step.key === key);
  const stage = index >= 0 ? STATUS_STEPS[index]!.label : raw.replace(/_/g, " ") || "Received";
  const action = key === "documents_required" ? "Upload your documents"
    : key === "additional_steps_required" ? "A few more items are needed"
    : key === "offer" ? "Review your offer"
    : key === "off_to_lender" ? "With lenders now"
    : "We're working on it";
  return { stage, step: index >= 0 ? index + 1 : 1, totalSteps, action, final: false };
}

type SyncOptions = { applicationId: string; business: string; stage: string; step: number; totalSteps: number; action: string; final: boolean };

interface ApplicationStatusPlugin {
  sync(options: SyncOptions): Promise<{ shown: boolean }>;
  end(options: { applicationId?: string }): Promise<void>;
}

const ApplicationStatus = registerPlugin<ApplicationStatusPlugin>("ApplicationStatus");

const available = (): boolean => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("ApplicationStatus");

let lastShown = "";
const registeredAndroid = new Set<string>();

/** Called with each stage read (MiniPortalPage polls it). Only a change reaches the native side. */
export async function syncApplicationStatus(input: { applicationId?: string | null; stage?: string | null; business?: string | null }): Promise<void> {
  const applicationId = String(input.applicationId ?? "").trim();
  const stage = String(input.stage ?? "").trim();
  if (!applicationId || !stage || !available()) return;
  const content = statusContent(stage);
  const business = String(input.business ?? "").trim();
  const signature = [applicationId, content.stage, content.step, content.action, business].join("|");
  if (signature === lastShown) return;
  lastShown = signature;
  await ApplicationStatus.sync({ applicationId, business, ...content }).catch((): void => undefined);
  if (Capacitor.getPlatform() === "android" && !content.final && !registeredAndroid.has(applicationId)) {
    registeredAndroid.add(applicationId);
    try {
      const { apiCall } = await import("@/api/client");
      await apiCall("/api/client/application-status/watch", { method: "POST", body: { applicationId, platform: "android" } });
    } catch {
      registeredAndroid.delete(applicationId); // try again on the next read
    }
  }
}

/** Sign-out: nothing about the last account stays on the lock screen. */
export async function endApplicationStatus(): Promise<void> {
  lastShown = "";
  registeredAndroid.clear();
  if (!available()) return;
  await ApplicationStatus.end({}).catch((): void => undefined);
}
