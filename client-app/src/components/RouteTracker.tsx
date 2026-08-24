import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackJourneyPageview } from "@/lib/journey"; // BF_CLIENT_JOURNEY_PAGEVIEW_v185

// #62 — fire a GTM page_view on every SPA route change.
export default function RouteTracker(): null {
  const location = useLocation();
  useEffect(() => {
    const w = window as unknown as { dataLayer?: unknown[] };
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({
        event: "page_view",
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
        timestamp: Date.now(),
      });
    }
    // BF_CLIENT_JOURNEY_PAGEVIEW_v185 - GTM got a page_view on every route change but the
    // journey collector got nothing, so the CRM could show wizard steps and no pages. To
    // see what someone actually did before abandoning, every route has to be recorded.
    try { trackJourneyPageview(location.pathname, document.title); } catch { /* ignore */ }
  }, [location.pathname, location.search]);
  return null;
}
