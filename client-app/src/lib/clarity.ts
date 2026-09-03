// BF_CLIENT_CLARITY_LOADER_v163
// Load Microsoft Clarity for session recording on the client wizard so the
// sessions the CRM links to actually exist, and so identifyClarity() (v162) has
// a real window.clarity to tag with the applicant's phone. Project x8jrwbuviw is
// the client-app Clarity project. Guarded so it never double-loads if GTM (or
// anything else) already injected a Clarity tag on the page.
const CLARITY_PROJECT_ID = "x8jrwbuviw";

export function initClarity(): void {
  try {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if ((window as any).clarity) return;
    if (document.querySelector('script[src*="clarity.ms/tag"]')) return;
    (function (c: any, l: Document, a: string, r: string, i: string) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      const t = l.createElement(r) as HTMLScriptElement;
      t.async = true;
      t.src = "https://www.clarity.ms/tag/" + i;
      const y = l.getElementsByTagName(r)[0];
      if (y && y.parentNode) {
        y.parentNode.insertBefore(t, y);
      } else {
        (l.head || l.documentElement).appendChild(t);
      }
    })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
  } catch {
    // Analytics must never block application boot.
  }
}
