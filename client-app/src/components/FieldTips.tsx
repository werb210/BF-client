// BF_CLIENT_FIELD_TIPS_v1 - decorates wizard <label> elements with a small "?"
// button and a tap/click tooltip, driven purely by label text via
// content/fieldHelp.ts. Mounted once inside StepHeader, so every step gets
// tips with zero per-step wiring. DOM-additive only: labels without a help
// entry are untouched, and decorated labels are flagged to avoid duplicates.
import { useEffect } from "react";
import { helpForLabel } from "../content/fieldHelp";

const FLAG = "borealTipDone";

function decorate(root: ParentNode) {
  const labels = root.querySelectorAll("label");
  labels.forEach((label) => {
    const el = label as HTMLLabelElement & { dataset: DOMStringMap };
    if (el.dataset[FLAG]) return;
    const text = (el.textContent || "").trim();
    if (!text) return;
    const help = helpForLabel(text);
    if (!help) return;
    el.dataset[FLAG] = "1";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "?";
    btn.setAttribute("aria-label", `Help: ${text}`);
    btn.style.cssText =
      "margin-left:6px;width:16px;height:16px;border-radius:50%;border:1px solid #93c5fd;" +
      "background:#eff6ff;color:#2563eb;font-size:11px;font-weight:700;line-height:1;" +
      "cursor:pointer;vertical-align:middle;padding:0;display:inline-flex;align-items:center;justify-content:center;";

    const tip = document.createElement("span");
    tip.textContent = help;
    tip.setAttribute("role", "tooltip");
    tip.style.cssText =
      "display:none;position:absolute;z-index:60;max-width:280px;background:#111827;color:#fff;" +
      "font-size:12px;font-weight:400;line-height:1.5;border-radius:8px;padding:8px 10px;" +
      "margin-top:6px;box-shadow:0 8px 24px rgba(0,0,0,0.25);";

    const wrap = document.createElement("span");
    wrap.style.cssText = "position:relative;display:inline-block;";
    wrap.appendChild(btn);
    wrap.appendChild(tip);
    el.appendChild(wrap);

    const close = () => { tip.style.display = "none"; };
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = tip.style.display === "block";
      document.querySelectorAll('[role="tooltip"]').forEach((t) => { (t as HTMLElement).style.display = "none"; });
      tip.style.display = open ? "none" : "block";
    });
    btn.addEventListener("blur", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  });
}

export function FieldTips(): null {
  useEffect(() => {
    decorate(document);
    const obs = new MutationObserver(() => decorate(document));
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return null;
}
