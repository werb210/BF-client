// BF_CLIENT_BLOCK_v_ATTRIBUTION_v1 - first-touch marketing attribution. Captured
// once at app load (UTM params + referrer + landing page) and attached to the
// /api/public/application/start call so staff can see which source produced
// submitted applications.
const KEY = "bf_attribution";

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  landing_page?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  li_fat_id?: string; // BF_CLIENT_LI_FAT_ID_v1
  sessionId?: string; // BF_CLIENT_VISITOR_JOURNEY_v1 - stitches the website journey to this application
  ref?: string; // BF_CLIENT_REFERRAL_REF_v1 - referral code from a referrer landing page (?ref=)
};

export function captureAttribution(): void {
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return; // first-touch wins
    const p = new URLSearchParams(window.location.search);
    const a: Attribution = {};
    const src = (p.get("utm_source") || "").trim();
    const med = (p.get("utm_medium") || "").trim();
    const camp = (p.get("utm_campaign") || "").trim();
    if (src) a.utm_source = src;
    if (med) a.utm_medium = med;
    if (camp) a.utm_campaign = camp;
    const gclid = (p.get("gclid") || "").trim();
    const gbraid = (p.get("gbraid") || "").trim();
    const wbraid = (p.get("wbraid") || "").trim();
    if (gclid) a.gclid = gclid;
    if (gbraid) a.gbraid = gbraid;
    if (wbraid) a.wbraid = wbraid;
    const liFatId = (p.get("li_fat_id") || "").trim();
    if (liFatId) a.li_fat_id = liFatId;
    // BF_CLIENT_VISITOR_JOURNEY_v1 - the website forwards its anonymous journey session id.
    const journeySession = (p.get("journeySession") || "").trim();
    if (journeySession) a.sessionId = journeySession;
    // BF_CLIENT_REFERRAL_REF_v1 - referral code carried from a referrer landing
    // page ("Apply now" -> client.boreal.financial?ref=<code>). Rides through to
    // /api/public/application/start as attribution.ref, which BF-Server stores on
    // metadata.attribution.ref and credits the referrer at application-accepted.
    const ref = (p.get("ref") || "").trim();
    if (ref) a.ref = ref;
    try { if (document.referrer) a.referrer = document.referrer; } catch { /* ignore */ }
    a.landing_page = window.location.pathname + window.location.search;
    if (Object.keys(a).length) sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch { /* sessionStorage unavailable - skip */ }
}

export function getAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    const a = JSON.parse(raw) as Attribution;
    return a && typeof a === "object" ? a : {};
  } catch { return {}; }
}
