import { type JSX, useEffect } from "react";
import { useLocation } from "react-router-dom";

// #62 — fire a GTM page_view on every SPA route change.
export default function RouteTracker(): JSX.Element | null {
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
  }, [location.pathname, location.search]);
  return null;
}
