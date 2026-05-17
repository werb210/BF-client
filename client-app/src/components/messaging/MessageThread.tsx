// BF_CLIENT_BLOCK_v164_MESSENGER_LINKIFY_v1
// BF_CLIENT_BLOCK_v164_MESSENGER_LINKIFY_HOTFIX_v1 — restored opening <a tag.
import { useMemo } from "react";
import type { JSX } from "react";

// BF_CLIENT_BLOCK_44_v1 -- cta_label + cta_action surface inline
// action buttons on staff messages (e.g. "Re-upload tax returns").
export type ThreadMessage = {
  id: string;
  authorRole: "self" | "other";
  authorName?: string;
  body: string;
  createdAt: string;
  ctaLabel?: string | null;
  ctaAction?: string | null;
};

type Props = {
  messages: ThreadMessage[];
  onHashtagClick?: (tag: string, label: string) => void;
  // BF_CLIENT_BLOCK_44_v1
  onCtaClick?: (action: string) => void;
  emptyText?: string;
};

const HASHTAG_RE = /(^|\s)#([a-z0-9][a-z0-9_-]{1,40})/gi;

// http(s) URLs render as <a> tags so system messages from BF-Server
// (notably the BI PGI completion link) are tappable. Pattern: starts
// with http(s)://, ends at the first whitespace or trailing punctuation.
const URL_RE = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]]/gi;

function initials(name?: string): string {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function renderTextSegment(
  segment: string,
  keyPrefix: string,
): Array<JSX.Element | string> {
  const parts: Array<JSX.Element | string> = [];
  let last = 0;
  let urlMatch: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((urlMatch = URL_RE.exec(segment)) !== null) {
    if (urlMatch.index > last) parts.push(segment.slice(last, urlMatch.index));
    const url = urlMatch[0];
    parts.push(
      <a
        key={`${keyPrefix}-${urlMatch.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="msg-link"
      >
        {url}
      </a>,
    );
    last = urlMatch.index + url.length;
  }
  if (last < segment.length) parts.push(segment.slice(last));
  return parts;
}

function renderBody(
  body: string,
  onHashtagClick?: (tag: string, label: string) => void,
): JSX.Element {
  const out: Array<JSX.Element | string> = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  HASHTAG_RE.lastIndex = 0;
  while ((m = HASHTAG_RE.exec(body)) !== null) {
    const before = body.slice(lastIdx, m.index + m[1].length);
    if (before) out.push(...renderTextSegment(before, `t-${m.index}`));
    const tag = `#${m[2]}`;
    const label = m[2].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    out.push(
      <button
        key={`${m.index}-${tag}`}
        type="button"
        className="msg-hashtag-chip"
        onClick={() => onHashtagClick?.(tag, label)}
      >
        {label}
      </button>,
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < body.length) {
    out.push(...renderTextSegment(body.slice(lastIdx), "tail"));
  }
  return <>{out}</>;
}

export default function MessageThread({ messages, onHashtagClick, onCtaClick, emptyText }: Props) {
  const items = useMemo(
    () => messages.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages],
  );

  // BF_CLIENT_BLOCK_44_v1
  const handleCta = (action: string) => {
    onCtaClick?.(action);
  };

  if (items.length === 0) {
    return <div className="msg-thread-empty">{emptyText ?? "No messages yet."}</div>;
  }

  return (
    <ul className="msg-thread">
      {items.map((m) => (
        <li key={m.id} className={`msg-row msg-row--${m.authorRole}`}>
          <div className="msg-avatar" aria-hidden="true">{initials(m.authorName)}</div>
          <div className="msg-bubble">
            {m.authorName ? <div className="msg-author">{m.authorName}</div> : null}
            <div className="msg-body">
              {renderBody(m.body, onHashtagClick)}
              {/* BF_CLIENT_BLOCK_44_v1 -- inline CTA bubble */}
              {m.ctaLabel && m.ctaAction ? (
                <button
                  type="button"
                  onClick={() => handleCta(m.ctaAction as string)}
                  style={{
                    display: "block",
                    marginTop: 8,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "#2563eb",
                    color: "#fff",
                    border: 0,
                    borderRadius: 16,
                    cursor: "pointer",
                  }}
                >
                  {m.ctaLabel}
                </button>
              ) : null}
            </div>
            <div className="msg-time">{new Date(m.createdAt).toLocaleTimeString()}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
