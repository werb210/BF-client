// BF_CLIENT_v819_CLIENT_MMS - one chat attachment. Attachments the client added in the app carry a dataUrl and render
// exactly as before. A picture the client texted to Boreal arrives from the server as { url } pointing at the
// owner-guarded /api/client/messages/:id/media route, which needs the Authorization header an <img src> cannot
// send, so it is fetched with the same token apiCall uses (Keychain-hydrated on native) into an object URL.
// BF_CLIENT_v824_CHAT_MEDIA - what is shown follows what actually arrived, not the server's guess: a voicemail left on
// the Boreal line is audio and gets a player (it showed as a broken picture), and a picture this device can't draw
// (e.g. HEIC on Android) becomes an "Open picture" link instead of a broken-image box.
import { useEffect, useState, type CSSProperties } from "react";
import { ENV } from "@/env";
import { getToken } from "@/auth/token";

export type ChatAttachment = { name: string; contentType?: string | null; dataUrl?: string; url?: string };

type Props = {
  attachment: ChatAttachment;
  imageStyle?: CSSProperties;
  linkStyle?: CSSProperties;
  /** Text before a file name, e.g. "📎 ". */
  filePrefix?: string;
};

const DEFAULT_IMAGE: CSSProperties = { maxWidth: 200, maxHeight: 200, borderRadius: 8, display: "block" };
const DEFAULT_LINK: CSSProperties = { fontSize: 13, color: "inherit", textDecoration: "underline" };
// BF_CLIENT_v819_CLIENT_MMS - status text takes the bubble's own text colour, so it reads on both bubble colours.
const STATUS: CSSProperties = { fontSize: 13, color: "inherit", fontStyle: "italic", display: "block" };
const AUDIO: CSSProperties = { display: "block", width: 240, maxWidth: "100%" };

type Kind = "image" | "audio" | "file";

/** What to draw for a content type. */
export function attachmentKind(contentType: string | null | undefined): Kind {
  const ct = String(contentType ?? "").split(";")[0]!.trim().toLowerCase();
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("audio/")) return "audio";
  return "file";
}

function apiBase(): string {
  return String(ENV.API_BASE || "https://server.boreal.financial").replace(/\/+$/, "");
}

export function attachmentSrc(url: string): string {
  return /^https?:\/\//i.test(url) ? url : apiBase() + (url.startsWith("/") ? url : "/" + url);
}

export default function AuthorizedAttachment({ attachment: a, imageStyle, linkStyle, filePrefix = "📎 " }: Props) {
  const isImage = attachmentKind(a.contentType) === "image";
  const imgStyle = imageStyle ?? DEFAULT_IMAGE;
  const lnkStyle = linkStyle ?? DEFAULT_LINK;
  const remote = !a.dataUrl && a.url ? a.url : null;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fetchedType, setFetchedType] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [undrawable, setUndrawable] = useState(false);

  useEffect(() => {
    if (!remote) return undefined;
    let cancelled = false;
    let created: string | null = null;
    setObjectUrl(null);
    setFetchedType(null);
    setFailed(false);
    setUndrawable(false);
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(attachmentSrc(remote), {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const headerType = typeof res.headers?.get === "function" ? res.headers.get("content-type") : null;
        created = URL.createObjectURL(blob);
        setFetchedType(blob.type || headerType || null);
        setObjectUrl(created);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [remote]);

  // Attachments added in the app.
  if (a.dataUrl) {
    if (isImage && !undrawable) {
      return (
        <a href={a.dataUrl} target="_blank" rel="noreferrer">
          <img src={a.dataUrl} alt={a.name} style={imgStyle} onError={() => setUndrawable(true)} />
        </a>
      );
    }
    return (
      <a href={a.dataUrl} download={a.name} style={lnkStyle}>
        {filePrefix}{a.name}
      </a>
    );
  }
  if (!remote) return null;

  const kind = fetchedType ? attachmentKind(fetchedType) : attachmentKind(a.contentType);
  const label = kind === "audio" ? "Voicemail" : kind === "image" ? "Picture" : a.name || "File";
  if (failed) return <span style={STATUS} data-testid="attachment-error">{label} couldn't load</span>;
  if (!objectUrl) return <span style={STATUS} data-testid="attachment-loading">{label}</span>;
  if (kind === "audio") {
    return <audio controls preload="metadata" src={objectUrl} style={AUDIO} aria-label={label} data-testid="attachment-audio" />;
  }
  if (kind === "image" && !undrawable) {
    return (
      <a href={objectUrl} target="_blank" rel="noreferrer">
        <img src={objectUrl} alt={a.name || "Picture"} style={{ ...imgStyle, maxWidth: 200, maxHeight: 200 }}
          onError={() => setUndrawable(true)} />
      </a>
    );
  }
  return (
    <a href={objectUrl} download={a.name || (kind === "image" ? "picture" : "file")} target="_blank" rel="noreferrer" style={lnkStyle}>
      {kind === "image" ? "Open picture" : "📎 " + (a.name || "File")}
    </a>
  );
}
