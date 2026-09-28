// BF_CLIENT_TODO_PANEL_v630
import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const calls = vi.hoisted(() => ({ n: 0, items: [] as Array<{ key: string; kind: string; label: string; urgent: boolean }> }));
vi.mock("../../api/client", () => ({
  apiCall: vi.fn(async () => { calls.n += 1; return { outstanding: calls.items, completed: [], outstandingCount: calls.items.length }; }),
}));
vi.mock("@/native/appBadge", () => ({ setAppBadge: vi.fn() }));
vi.mock("@/native/clientWidget", () => ({ updateClientWidget: vi.fn(), actionLine: () => "Nothing to do" }));

import ActionCenter from "../ActionCenter";

const page = readFileSync("src/pages/MiniPortalPage.tsx", "utf-8");

beforeEach(() => { calls.n = 0; calls.items = [{ key: "upload:id", kind: "document", label: "2 pieces of Government Issued ID", urgent: false }]; });

describe("v630 what you need to do", () => {
  it("re-reads the server when refreshKey changes, and empties once the item is done", async () => {
    const { rerender } = render(<ActionCenter applicationId="a1" refreshKey={0} />);
    await screen.findByText("2 pieces of Government Issued ID");
    calls.items = [];
    rerender(<ActionCenter applicationId="a1" refreshKey={1} />);
    await waitFor(() => expect(screen.queryByText("2 pieces of Government Issued ID")).toBeNull());
    expect(calls.n).toBeGreaterThanOrEqual(2);
  });

  it("sits under the header and stage bar, above the chat", () => {
    const panel = page.indexOf("<ActionCenter applicationId={applicationId}");
    expect(panel).toBeGreaterThan(page.indexOf("<SlimHeader />"));
    expect(panel).toBeGreaterThan(page.indexOf('className="mp-tracker"'));
    expect(panel).toBeLessThan(page.indexOf('<section className="mp-thread-card">'));
  });

  it("is refreshed after uploads and on every poll", () => {
    expect(page).toContain("refreshKey={todoRefresh}");
    expect(page).toContain("setTodoRefresh((n) => n + 1); }}");
  });
});
