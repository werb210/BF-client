// BF_CLIENT_CLARITY_PLAYBACK_v170
// Reconstruct the Microsoft Clarity per-session PLAYER url for the current
// visitor so staff can open this exact recording from the CRM (one click, no
// searching). Clarity has no deep-link API; the player url is built from the
// _clck (user) and _clsk (session) cookies plus the project id, per Clarity's
// documented format: https://clarity.microsoft.com/player/<project>/<user>/<session>
const CLARITY_PROJECT_ID = "x8jrwbuviw";

function readCookie(name: string): string | undefined {
  try {
    const jar = typeof document !== "undefined" ? document.cookie : "";
    for (const part of jar ? jar.split("; ") : []) {
      const eq = part.indexOf("=");
      const key = eq === -1 ? part : part.slice(0, eq);
      if (key === name) return decodeURIComponent(part.slice(eq + 1) || "");
    }
  } catch {
    /* cookie access can throw in sandboxed contexts */
  }
  return undefined;
}

// Clarity packs several values into each cookie, delimited by "^" (older: "|").
function firstSegment(value: string): string {
  return (value.includes("^") ? value.split("^") : value.split("|"))[0] || "";
}

export function getClarityPlaybackUrl(): string | null {
  const clck = readCookie("_clck");
  const clsk = readCookie("_clsk");
  if (!clck || !clsk) return null;
  const user = firstSegment(clck);
  const session = firstSegment(clsk);
  if (!user || !session) return null;
  return `https://clarity.microsoft.com/player/${CLARITY_PROJECT_ID}/${user}/${session}`;
}
