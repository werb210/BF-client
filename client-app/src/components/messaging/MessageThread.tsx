// BF_CLIENT_v68_BLOCK_3_1 — shared iMessage-style thread for mini-portal.
// Sender (current user) on the right, recipient on the left.
// In the mini-portal, the client is "self" so client bubbles render right
// and staff bubbles render left.
import { useMemo } from "react";
import "./MessageThread.css";

export type ThreadMessage = {
  id: string;
  authorRole: "self" | "other";
  authorName?: string;
  body: string;
  createdAt: string; // ISO
};

type Props = {
  messages: ThreadMessage[];
  onHashtagClick?: (tag: string, label: string) => void;
  emptyText?: string;
};

const HASHTAG_RE = /(^|\s)#([a-zA-Z][\w-]*)/g;

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return iso; }
}

function initials(name?: string): string {
  if (!name) return "··";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function renderBody(
  body: string,
  onHashtagClick?: (tag: string, label: string) => void
): JSX.Element {
  const out: Array<JSX.Element | string> = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  HASHTAG_RE.lastIndex = 0;
  while ((m = HASHTAG_RE.exec(body)) !== null) {
    const before = body.slice(lastIdx, m.index + m[1].length);
    if (before) out.push(before);
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
      </button>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < body.length) out.push(body.slice(lastIdx));
  return <>{out}</>;
}

export default function MessageThread({ messages, onHashtagClick, emptyText }: Props) {
  const items = useMemo(
    () => messages.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  );
  if (items.length === 0) {
    return <div className="msg-thread msg-thread--empty">{emptyText ?? "No messages yet."}</div>;
  }
  return (
    <div className="msg-thread" role="log" aria-live="polite">
      {items.map((m) => {
        const right = m.authorRole === "self";
        return (
          <div key={m.id} className={`msg-row ${right ? "msg-row--right" : "msg-row--left"}`}>
            {!right && (
              <div className="msg-avatar" aria-hidden>{initials(m.authorName)}</div>
            )}
            <div className="msg-bubble-wrap">
              <div className={`msg-bubble ${right ? "msg-bubble--self" : "msg-bubble--other"}`}>
                {renderBody(m.body, onHashtagClick)}
              </div>
              <div className="msg-meta">
                {m.authorName ? <span>{m.authorName}</span> : null}
                <span>{formatTimestamp(m.createdAt)}</span>
              </div>
            </div>
            {right && (
              <div className="msg-avatar msg-avatar--self" aria-hidden>{initials(m.authorName)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
