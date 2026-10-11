// BF_CLIENT_CLARITY_LOADER_v163
// Load Microsoft Clarity for session recording on the client wizard so the
// sessions the CRM links to (BF_CLIENT_CLARITY_PLAYBACK_v170) actually exist.
// Project x8jrwbuviw is the client-app Clarity project. Guarded so it never
// double-loads if GTM (or anything else) already injected a Clarity tag.
//
// BF_CLIENT_v789_ANALYTICS_GATES - session recording starts only after the
// visitor ACCEPTS analytics in the consent banner (implied consent is not
// enough for a screen recording), and never in the native apps. No phone
// number or other identifier is ever sent to Clarity.
import { CONSENT_KEY } from "@/utils/analytics";
import { isNativeBuild } from "./thirdPartyTags";

const CLARITY_PROJECT_ID = "x8jrwbuviw";

export function hasAcceptedAnalytics(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

type ClarityQueue = ((...args: unknown[]) => void) & { q?: unknown[][] };

export function initClarity(): void {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (isNativeBuild()) return;
    if (!hasAcceptedAnalytics()) return;
    const w = window as Window & { clarity?: ClarityQueue };
    if (w.clarity) return;
    if (document.querySelector('script[src*="clarity.ms/tag"]')) return;
    // The official snippet's queue: calls made before the tag loads are kept
    // as `arguments` objects and replayed by the tag.
    const queue: ClarityQueue = function () {
      // eslint-disable-next-line prefer-rest-params
      (queue.q = queue.q || []).push(Array.prototype.slice.call(arguments));
    };
    w.clarity = queue;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.clarity.ms/tag/" + CLARITY_PROJECT_ID;
    const first = document.getElementsByTagName("script")[0];
    if (first && first.parentNode) {
      first.parentNode.insertBefore(script, first);
    } else {
      (document.head || document.documentElement).appendChild(script);
    }
  } catch {
    // Analytics must never block application boot.
  }
}
