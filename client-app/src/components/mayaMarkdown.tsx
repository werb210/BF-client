// BF_CLIENT_MAYA_MARKDOWN_v438
// Maya emits a narrow, predictable subset of markdown. Rather than take on a
// parser plus a sanitiser for four constructs, render those four directly as
// React nodes - no HTML string is ever built, so there is nothing to sanitise
// and no injection surface.
import type { ReactNode } from "react";

const BOLD_OR_LINK = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;

/** Bold spans and links inside one line. Anything else stays literal text. */
export function renderInline(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of line.matchAll(BOLD_OR_LINK)) {
    const at = match.index ?? 0;
    if (at > last) out.push(line.slice(last, at));
    if (match[1]) {
      out.push(<strong key={`b${key++}`}>{match[1].slice(2, -2)}</strong>);
    } else if (match[2]) {
      const label = match[2].slice(1, match[2].indexOf("]"));
      // Only http(s) reaches here - the pattern refuses javascript: and data:.
      out.push(
        <a
          key={`l${key++}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {label}
        </a>,
      );
    }
    last = at + match[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out.length ? out : [line];
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

/**
 * Split a reply into paragraphs and lists. Maya writes lists two ways: on their
 * own lines, and run inline as "1. Foo 2. Bar" inside one sentence - the second
 * is what made replies read as a wall of text.
 */
export function toBlocks(message: string): Block[] {
  const text = String(message ?? "")
    // Break an inline numbered run apart: " 2. " becomes a new line.
    .replace(/\s+(\d{1,2})\.\s+/g, "\n$1. ")
    // BF_CLIENT_MAYA_HYPHEN_v447 - an inline " - " is far more often a hyphen in
    // a name ("Test - Todd's Gym") than a list bullet, and there is no way to
    // tell them apart mid-sentence. Only split when the dash follows a colon,
    // which is how Maya actually introduces an inline run.
    .replace(/:\s+-\s+/g, ":\n- ")
    .replace(/\s+-\s+(?=\*\*)/g, "\n- ");

  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const ol = /^(\d{1,2})\.\s+(.*)$/.exec(line);
    const ul = /^[-•]\s+(.*)$/.exec(line);
    const tail = blocks[blocks.length - 1];
    if (ol) {
      if (tail?.kind === "ol") tail.items.push(ol[2]);
      else blocks.push({ kind: "ol", items: [ol[2]] });
    } else if (ul) {
      if (tail?.kind === "ul") tail.items.push(ul[1]);
      else blocks.push({ kind: "ul", items: [ul[1]] });
    } else if (tail?.kind === "p") {
      tail.lines.push(line);
    } else {
      blocks.push({ kind: "p", lines: [line] });
    }
  }
  return blocks;
}

export function MayaMessage({ message }: { message: string }) {
  const blocks = toBlocks(message);
  if (blocks.length === 0) return <>{message}</>;
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "ul") {
          return (
            <ul key={index} className="ml-4 list-disc space-y-1 py-1">
              {block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol key={index} className="ml-4 list-decimal space-y-1 py-1">
              {block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
            </ol>
          );
        }
        return (
          <p key={index} className={index > 0 ? "pt-2" : undefined}>
            {block.lines.map((line, i) => (
              <span key={i}>{i > 0 ? " " : null}{renderInline(line)}</span>
            ))}
          </p>
        );
      })}
    </>
  );
}
