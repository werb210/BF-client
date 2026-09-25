// BF_CLIENT_BLOCK_v509_CLIENT_SEEN
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(__dirname, "../MiniPortalPage.tsx"), "utf8");

describe("v509 Seen on the client's own messages", () => {
  it("maps read_at to seen for the client's messages and shows it by the time", () => {
    expect(page).toContain('seen: role === "self" && Boolean(item.read_at ?? item.readAt)');
    expect(page).toContain('m.authorRole === "self" && m.seen ? " \\u00b7 Seen" : ""');
  });
});
